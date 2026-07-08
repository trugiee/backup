import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/sold-artworks', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const sales = await prisma.soldArtwork.findMany({
      orderBy: { saleDate: 'desc' },
      include: { collector: true, artwork: true },
    });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sold artworks:', error);
    res.status(500).json({ error: 'Failed to fetch sold artworks' });
  }
});

router.post('/sold-artworks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sale = await prisma.soldArtwork.create({
      data: req.body as any,
      include: { collector: true, artwork: true },
    });
    res.status(201).json(sale);
  } catch (error) {
    console.error('Error creating sold artwork record:', error);
    res.status(500).json({ error: 'Failed to create sold artwork record' });
  }
});

router.put('/sold-artworks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sale = await prisma.soldArtwork.update({
      where: { id: req.params.id as string },
      data: req.body as any,
    });
    res.json(sale);
  } catch (error) {
    console.error('Error updating sold artwork record:', error);
    res.status(500).json({ error: 'Failed to update sold artwork record' });
  }
});

router.delete('/sold-artworks/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.soldArtwork.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Sold artwork record deleted' });
  } catch (error) {
    console.error('Error deleting sold artwork record:', error);
    res.status(500).json({ error: 'Failed to delete sold artwork record' });
  }
});

export default router;
