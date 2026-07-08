import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sendEmail, buildNotificationEmail } from '../lib/mail';

const router = Router();

const artworkIncludes = {
  exhibitor: true,
  contributors: { include: { exhibitor: { select: { id: true, name: true } } } },
};

router.get('/artworks', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const artworks = await prisma.artwork.findMany({
      where: { status: { notIn: ['Pending Payment', 'Deleted'] } },
      orderBy: { createdAt: 'desc' },
      include: artworkIncludes,
    });
    res.json(artworks);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

router.get('/artworks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: req.params.id as string },
      include: artworkIncludes,
    });
    if (!artwork) {
      res.status(404).json({ error: 'Artwork not found' });
      return;
    }
    res.json(artwork);
  } catch (error) {
    console.error('Error fetching artwork:', error);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

router.post('/artworks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { contributorIds, ...data } = req.body as any;
    const artwork = await prisma.artwork.create({
      data: {
        ...data,
        contributors: contributorIds?.length
          ? { create: contributorIds.map((exhibitorId: string) => ({ exhibitorId })) }
          : undefined,
      },
      include: artworkIncludes,
    });
    res.status(201).json(artwork);
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Failed to create artwork' });
  }
});

router.put('/artworks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { contributorIds, ...data } = req.body as any;
    const id = req.params.id as string;

    const existing = await prisma.artwork.findUnique({
      where: { id },
      select: { status: true, title: true },
    });
    if (!existing) { res.status(404).json({ error: 'Artwork not found' }); return; }

    const artwork = await prisma.$transaction(async (tx) => {
      if (contributorIds !== undefined) {
        await tx.artworkContributor.deleteMany({ where: { artworkId: id } });
        if (contributorIds.length > 0) {
          await tx.artworkContributor.createMany({
            data: contributorIds.map((exhibitorId: string) => ({
              artworkId: id,
              exhibitorId,
            })),
          });
        }
      }
      return tx.artwork.update({
        where: { id },
        data,
        include: artworkIncludes,
      });
    });

    if (artwork.status === 'Sold' && existing.status !== 'Sold') {
      const interestedCollectors = await prisma.message.findMany({
        where: { artworkId: id, senderRole: 'collector' },
        select: { collectorId: true },
        distinct: ['collectorId'],
      });

      if (interestedCollectors.length > 0) {
        await prisma.notification.createMany({
          data: interestedCollectors.map(c => ({
            title: 'Artwork Sold',
            message: `The artwork "${artwork.title}" is sold.`,
            target: 'user',
            userId: c.collectorId,
          })),
        });

        // Send email to interested collectors
        try {
          const collectors = await prisma.collector.findMany({
            where: { id: { in: interestedCollectors.map(c => c.collectorId) } },
            select: { email: true, name: true },
          });
          const { subject, html } = buildNotificationEmail(
            'Artwork Sold',
            `The artwork "${artwork.title}" that you were interested in has been sold.`,
          );
          await sendEmail(collectors.map(c => c.email!).filter(Boolean), subject, html);
        } catch (err) {
          console.error('Failed to send sold artwork emails:', err);
        }
      }
    }

    res.json(artwork);
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json({ error: 'Failed to update artwork' });
  }
});

router.delete('/artworks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!artwork) { res.status(404).json({ error: 'Artwork not found' }); return; }
    if (artwork.status === 'Sold') {
      res.status(400).json({ error: 'Cannot delete a sold artwork' });
      return;
    }
    if (artwork.status === 'Pending Payment') {
      res.status(400).json({ error: 'Cannot delete an artwork with a pending payment' });
      return;
    }
    await prisma.artwork.update({
      where: { id },
      data: { status: 'Deleted' }
    });
    res.json({ message: 'Artwork deleted' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

export default router;
