import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.post('/reports', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subject, message } = req.body as { subject: string; message: string };
    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Subject and message are required' });
      return;
    }
    const report = await prisma.report.create({
      data: {
        userId: (req as any).user.id,
        userRole: (req as any).user.role,
        subject: subject.trim(),
        message: message.trim(),
      },
    });
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
