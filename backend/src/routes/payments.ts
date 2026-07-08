import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const LISTING_FEE = 5;
const LISTING_FEE_CENTAVOS = LISTING_FEE * 100;

function getPayMongoAuth(): string {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET + ':').toString('base64');
}

router.post('/payments/artwork-listing', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can list artworks' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        exhibitorId: user.id,
        amount: LISTING_FEE,
        status: 'pending',
      },
    });

    const admin = await prisma.admin.findFirst({ select: { paymentEnabled: true } });
    const paymentDisabled = admin?.paymentEnabled === false;

    if (!PAYMONGO_SECRET || PAYMONGO_SECRET.startsWith('sk_test_placeholder') || paymentDisabled) {
      await handleFreeListing(payment.id);
      res.json({ checkoutUrl: null, paymentId: payment.id, message: 'Ready (test mode)' });
      return;
    }

    const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getPayMongoAuth(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: LISTING_FEE_CENTAVOS,
            currency: 'PHP',
            description: 'List an artwork on Ggallery',
            statement_descriptor: 'GGALLERY',
            payment_method_types: ['gcash', 'card'],
            success_url: `${FRONTEND_URL}/?listing=success&payment_id=${payment.id}`,
            cancel_url: `${FRONTEND_URL}/?listing=cancelled`,
            metadata: { payment_id: payment.id },
            line_items: [
              {
                amount: LISTING_FEE_CENTAVOS,
                currency: 'PHP',
                name: 'Artwork Listing Fee',
                quantity: 1,
              },
            ],
          },
        },
      }),
    });

    const paymongoData = await paymongoRes.json();

    if (!paymongoRes.ok) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
      res.status(502).json({ error: paymongoData.errors?.[0]?.detail || 'Payment gateway error' });
      return;
    }

    const checkoutUrl = paymongoData.data?.attributes?.checkout_url;
    const checkoutId = paymongoData.data?.id;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutUrl, paymongoCheckoutId: checkoutId },
    });

    res.json({ checkoutUrl, paymentId: payment.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

async function handleFreeListing(paymentId: string) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'paid', paidAt: new Date() },
  });
}

router.post('/payments/confirm-and-create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { paymentId, artworkData } = req.body;

    if (!paymentId || !artworkData) {
      res.status(400).json({ error: 'paymentId and artworkData are required' });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (payment.status !== 'paid') {
      if (payment.paymongoCheckoutId) {
        const pmRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${payment.paymongoCheckoutId}`, {
          headers: { Authorization: getPayMongoAuth() },
        });
        const pmData = await pmRes.json();

        if (!pmRes.ok) {
          res.status(502).json({ error: 'Failed to verify payment with PayMongo' });
          return;
        }

        const pmPayments: any[] = pmData.data?.attributes?.payments || [];
        const paidPayment = pmPayments.find((p: any) => p.attributes?.status === 'paid');

        if (!paidPayment) {
          res.status(400).json({ error: 'Payment not yet completed' });
          return;
        }

        const paymongoPaymentId = paidPayment.id || null;
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'paid', paidAt: new Date(), paymongoPaymentId },
        });
      } else if (!PAYMONGO_SECRET || PAYMONGO_SECRET.startsWith('sk_test_placeholder')) {
        await handleFreeListing(paymentId);
      } else {
        res.status(400).json({ error: 'Payment not yet completed' });
        return;
      }
    }

    const artwork = await prisma.artwork.create({
      data: {
        title: artworkData.title,
        type: artworkData.type,
        yearCreated: artworkData.yearCreated || null,
        style: artworkData.style || null,
        description: artworkData.description || null,
        price: artworkData.price ? parseFloat(artworkData.price) : null,
        imageUrl: artworkData.imageUrl || null,
        media: artworkData.media || [],
        status: 'Available',
        attributes: artworkData.attributes || undefined,
        exhibitorId: user.id,
      },
    });

    if (artworkData.contributorIds?.length > 0) {
      await prisma.artworkContributor.createMany({
        data: artworkData.contributorIds.map((cId: string) => ({
          artworkId: artwork.id,
          exhibitorId: cId,
        })),
      });
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { artworkId: artwork.id },
    });

    res.json({ artwork, message: 'Artwork published!' });
  } catch (err) {
    console.error('Confirm and create error:', err);
    res.status(500).json({ error: 'Failed to publish artwork' });
  }
});

router.post('/payments/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventType = event.data?.attributes?.type;

    if (eventType === 'checkout_session.payment.paid') {
      const checkoutSession = event.data?.attributes?.data;
      const metadata = checkoutSession?.attributes?.metadata || {};
      const paymentId = metadata.payment_id;

      if (!paymentId) {
        res.status(400).json({ error: 'Missing payment_id in metadata' });
        return;
      }

      const payments = checkoutSession?.attributes?.payments || [];
      const paymongoPaymentId = payments[0]?.id || null;

      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'paid', paidAt: new Date(), paymongoPaymentId },
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
