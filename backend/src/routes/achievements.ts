import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Get all achievements for the logged-in exhibitor
router.get('/achievements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (userRole !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can access this endpoint' });
      return;
    }

    const achievements = await prisma.achievement.findMany({
      where: { exhibitorId: (req as any).user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Create a new achievement
router.post('/achievements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const admin = await prisma.admin.findFirst({ select: { achievementsEnabled: true } });
    if (admin?.achievementsEnabled === false) {
      res.status(403).json({ error: 'Achievement submissions are currently disabled by the admin.' });
      return;
    }
    const userRole = (req as any).user.role;
    if (userRole !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can create achievements' });
      return;
    }

    const data = {
      ...req.body,
      exhibitorId: (req as any).user.id,
      isVerified: false, // Force default to false on creation
    };

    const achievement = await prisma.achievement.create({ data });
    res.status(201).json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

// Update an achievement
router.put('/achievements/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (userRole !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can update achievements' });
      return;
    }

    const achievementId = req.params.id as string;
    
    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing || existing.exhibitorId !== (req as any).user.id) {
      res.status(404).json({ error: 'Achievement not found or unauthorized' });
      return;
    }

    const updateData = { ...req.body };
    delete updateData.isVerified; 

    const updated = await prisma.achievement.update({
      where: { id: achievementId },
      data: updateData,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

// Delete an achievement
router.delete('/achievements/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (userRole !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can delete achievements' });
      return;
    }

    const achievementId = req.params.id as string;
    
    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing || existing.exhibitorId !== (req as any).user.id) {
      res.status(404).json({ error: 'Achievement not found or unauthorized' });
      return;
    }

    await prisma.achievement.delete({ where: { id: achievementId } });
    res.json({ message: 'Achievement deleted' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

export default router;
