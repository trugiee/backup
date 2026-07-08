import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/exhibitors/:id/profile', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const [exhibitor, ownedArtworks, contributedArtworks, achievements] = await Promise.all([
      prisma.exhibitor.findUnique({
        where: { id },
        select: { id: true, name: true, bio: true, profilePicture: true, email: true, createdAt: true },
      }),
      prisma.artwork.findMany({
        where: { exhibitorId: id, status: { not: 'Deleted' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, imageUrl: true, media: true, price: true, status: true, type: true, yearCreated: true, attributes: true, createdAt: true },
      }),
      prisma.artwork.findMany({
        where: { contributors: { some: { exhibitorId: id } }, exhibitorId: { not: id }, status: { not: 'Deleted' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, imageUrl: true, media: true, price: true, status: true, type: true, yearCreated: true, attributes: true, createdAt: true },
      }),
      prisma.achievement.findMany({
        where: { exhibitorId: id },
        orderBy: { year: 'desc' },
        select: { id: true, title: true, description: true, year: true, isVerified: true, proofImageUrl: true, proofLink: true },
      }),
    ]);
    if (!exhibitor) { res.status(404).json({ error: 'Exhibitor not found' }); return; }
    const artworks = [...ownedArtworks, ...contributedArtworks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ exhibitor, artworks, achievements });
  } catch (error) {
    console.error('Error fetching exhibitor profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/exhibitors', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const exhibitors = await prisma.exhibitor.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, profilePicture: true },
    });
    res.json(exhibitors);
  } catch (error) {
    console.error('Error fetching exhibitors:', error);
    res.status(500).json({ error: 'Failed to fetch exhibitors' });
  }
});

router.post('/exhibitors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const exhibitor = await prisma.exhibitor.create({ data: req.body as any });
    res.status(201).json(exhibitor);
  } catch (error) {
    console.error('Error creating exhibitor:', error);
    res.status(500).json({ error: 'Failed to create exhibitor' });
  }
});

router.put('/exhibitors/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const exhibitor = await prisma.exhibitor.update({
      where: { id: req.params.id as string },
      data: req.body as any,
    });
    res.json(exhibitor);
  } catch (error) {
    console.error('Error updating exhibitor:', error);
    res.status(500).json({ error: 'Failed to update exhibitor' });
  }
});

router.delete('/exhibitors/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.exhibitor.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Exhibitor deleted' });
  } catch (error) {
    console.error('Error deleting exhibitor:', error);
    res.status(500).json({ error: 'Failed to delete exhibitor' });
  }
});

export default router;
