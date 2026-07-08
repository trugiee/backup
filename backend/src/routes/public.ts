import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/public/artworks', async (_req: Request, res: Response) => {
  try {
    const artworks = await prisma.artwork.findMany({
      where: { status: 'Available' },
      orderBy: { createdAt: 'desc' },
      include: {
        exhibitor: true,
        contributors: { include: { exhibitor: { select: { id: true, name: true } } } },
      },
    });
    res.json({ artworks });
  } catch (error) {
    console.error('Error fetching public artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

export default router;
