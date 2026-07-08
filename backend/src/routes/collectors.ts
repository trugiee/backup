import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/collectors/:id/profile', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const collector = await prisma.collector.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, bio: true, profilePicture: true, phone: true, address: true, createdAt: true },
    });
    if (!collector) { res.status(404).json({ error: 'Collector not found' }); return; }
    const soldArtworks = await prisma.soldArtwork.findMany({
      where: { collectorId: id },
      orderBy: { saleDate: 'desc' },
      select: { id: true, artworkTitle: true, salePrice: true, saleDate: true },
    });
    res.json({ collector, soldArtworks });
  } catch (error) {
    console.error('Error fetching collector profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/collectors', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const collectors = await prisma.collector.findMany({ orderBy: { name: 'asc' } });
    res.json(collectors);
  } catch (error) {
    console.error('Error fetching collectors:', error);
    res.status(500).json({ error: 'Failed to fetch collectors' });
  }
});

router.post('/collectors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const collector = await prisma.collector.create({ data: req.body as any });
    res.status(201).json(collector);
  } catch (error) {
    console.error('Error creating collector:', error);
    res.status(500).json({ error: 'Failed to create collector' });
  }
});

router.put('/collectors/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const collector = await prisma.collector.update({
      where: { id: req.params.id as string },
      data: req.body as any,
    });
    res.json(collector);
  } catch (error) {
    console.error('Error updating collector:', error);
    res.status(500).json({ error: 'Failed to update collector' });
  }
});

router.delete('/collectors/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.collector.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Collector deleted' });
  } catch (error) {
    console.error('Error deleting collector:', error);
    res.status(500).json({ error: 'Failed to delete collector' });
  }
});

export default router;
