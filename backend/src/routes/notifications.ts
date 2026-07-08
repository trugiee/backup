import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { sendEmail, buildNotificationEmail } from '../lib/mail';

const router = Router();

const adminMiddleware = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin only.' });
    return;
  }
  next();
};

// POST /api/admin/test-email - Test email configuration
router.post('/admin/test-email', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subject, html } = buildNotificationEmail(
      'Test Email',
      'This is a test email from Ggallery. If you received this, email notifications are working!',
      user.name
    );
    await sendEmail([user.email], subject, html);
    res.json({ message: `Test email sent to ${user.email}` });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// POST /api/admin/notifications - Admin sends a notification
router.post('/admin/notifications', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, message, target } = req.body;
    if (!title || !message || !target) {
      res.status(400).json({ error: 'title, message, and target are required' });
      return;
    }
    if (!['all', 'collectors', 'exhibitors'].includes(target)) {
      res.status(400).json({ error: 'target must be all, collectors, or exhibitors' });
      return;
    }
    const notification = await prisma.notification.create({
      data: { title, message, target },
    });

    // Send email to matching users
    const { subject, html } = buildNotificationEmail(title, message);
    try {
      if (target === 'all') {
        const [exhibitors, collectors] = await Promise.all([
          prisma.exhibitor.findMany({ select: { email: true, name: true } }),
          prisma.collector.findMany({ select: { email: true, name: true } }),
        ]);
        await sendEmail(
          [...exhibitors, ...collectors].map(u => u.email!).filter(Boolean),
          subject,
          html
        );
      } else if (target === 'exhibitors') {
        const exhibitors = await prisma.exhibitor.findMany({ select: { email: true } });
        await sendEmail(exhibitors.map(u => u.email!).filter(Boolean), subject, html);
      } else if (target === 'collectors') {
        const collectors = await prisma.collector.findMany({ select: { email: true } });
        await sendEmail(collectors.map(u => u.email!).filter(Boolean), subject, html);
      }
    } catch (err) {
      console.error('Failed to send email notifications:', err);
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Failed to create notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/:role - Fetch notifications for a role
router.get('/notifications/:role', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = req.params.role as string;
    if (!['collector', 'exhibitor'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const authUser = (req as any).user as { id: string; role: string };
    const user = role === 'collector'
      ? await prisma.collector.findUnique({ where: { id: authUser.id }, select: { createdAt: true } })
      : await prisma.exhibitor.findUnique({ where: { id: authUser.id }, select: { createdAt: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const target = role === 'collector' ? 'collectors' : 'exhibitors';
    const notifications = await prisma.notification.findMany({
      where: {
        createdAt: { gte: user.createdAt },
        OR: [
          { target: 'all' },
          { target },
          { target: 'user', userId: authUser.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
