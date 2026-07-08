import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { sendEmail, buildNotificationEmail } from '../lib/mail';

const router = Router();

const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin only.' });
    return;
  }
  next();
};

router.get('/admin/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      exhibitorsCount,
      collectorsCount,
      artworksCount,
      soldArtworks,
      statusGroups,
      typeGroups,
      recentSales,
      userRegs,
    ] = await Promise.all([
      prisma.exhibitor.count(),
      prisma.collector.count(),
      prisma.artwork.count({ where: { status: { not: 'Deleted' } } }),
      prisma.soldArtwork.aggregate({ _sum: { salePrice: true } }),
      prisma.artwork.groupBy({ by: ['status'], _count: true, where: { status: { not: 'Deleted' } } }),
      prisma.artwork.groupBy({ by: ['type'], _count: true, where: { status: { not: 'Deleted' } } }),
      prisma.soldArtwork.findMany({
        where: { saleDate: { gte: sixMonthsAgo } },
        select: { salePrice: true, saleDate: true },
      }),
      Promise.all([
        prisma.exhibitor.findMany({ select: { createdAt: true }, where: { createdAt: { gte: sixMonthsAgo } } }),
        prisma.collector.findMany({ select: { createdAt: true }, where: { createdAt: { gte: sixMonthsAgo } } }),
      ]),
    ]);

    const totalSalesValue = soldArtworks._sum.salePrice || 0;

    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    const salesByMonthData = monthLabels.map(label => {
      const [month, year] = label.split(' ');
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      const yearNum = parseInt(year);
      const entries = recentSales.filter(s => {
        const d = new Date(s.saleDate);
        return d.getMonth() === monthIndex && d.getFullYear() === yearNum;
      });
      return {
        month: label,
        sales: entries.reduce((sum, e) => sum + e.salePrice, 0),
        count: entries.length,
      };
    });

    const [exhibitorDates, collectorDates] = userRegs;
    const usersByMonthData = monthLabels.map(label => {
      const [month, year] = label.split(' ');
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      const yearNum = parseInt(year);
      return {
        month: label,
        exhibitors: exhibitorDates.filter(u => {
          const d = new Date(u.createdAt);
          return d.getMonth() === monthIndex && d.getFullYear() === yearNum;
        }).length,
        collectors: collectorDates.filter(u => {
          const d = new Date(u.createdAt);
          return d.getMonth() === monthIndex && d.getFullYear() === yearNum;
        }).length,
      };
    });

    const totalUsers = exhibitorsCount + collectorsCount;

    res.json({
      users: { total: totalUsers, exhibitors: exhibitorsCount, collectors: collectorsCount },
      artworks: { total: artworksCount, byStatus: statusGroups, byType: typeGroups },
      sales: { totalValue: totalSalesValue, byMonth: salesByMonthData },
      usersByMonth: usersByMonthData,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/achievements/pending', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isVerified: false },
      include: { exhibitor: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(achievements);
  } catch (error) {
    console.error('Failed to fetch pending achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/achievements/:id/verify', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const achievement = await prisma.achievement.update({
      where: { id },
      data: { isVerified: true }
    });

    await prisma.notification.create({
      data: {
        title: 'Achievement Verified',
        message: `Your achievement "${achievement.title}" has been verified.`,
        target: 'user',
        userId: achievement.exhibitorId,
      }
    });

    // Send email to the exhibitor
    try {
      const exhibitor = await prisma.exhibitor.findUnique({
        where: { id: achievement.exhibitorId },
        select: { email: true, name: true },
      });
      if (exhibitor?.email) {
        const { subject, html } = buildNotificationEmail(
          'Achievement Verified',
          `Your achievement "${achievement.title}" has been verified by the admin.`,
          exhibitor.name
        );
        await sendEmail([exhibitor.email], subject, html);
      }
    } catch (err) {
      console.error('Failed to send achievement email:', err);
    }

    res.json(achievement);
  } catch (error) {
    console.error('Failed to verify achievement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const exhibitors = await prisma.exhibitor.findMany({
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { artworks: true } } }
    });
    const collectors = await prisma.collector.findMany({
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { soldArtworks: true } } }
    });
    res.json({
      exhibitors: exhibitors.map(e => ({ ...e, role: 'exhibitor' })),
      collectors: collectors.map(c => ({ ...c, role: 'collector' }))
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/exhibitors/pending', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const collectors = await prisma.collector.findMany({
      where: { isPendingExhibitor: true },
      select: { id: true, name: true, email: true, phone: true, address: true, createdAt: true, bio: true, profilePicture: true }
    });
    res.json(collectors);
  } catch (error) {
    console.error('Failed to fetch pending exhibitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/exhibitors/approve/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const collector = await prisma.collector.findUnique({ where: { id } });
    
    if (!collector) {
      res.status(404).json({ error: 'Collector not found' });
      return;
    }

    const newExhibitor = await prisma.exhibitor.create({
      data: {
        name: collector.name,
        email: collector.email,
        password: collector.password,
        phone: collector.phone,
        address: collector.address,
        profilePicture: collector.profilePicture,
        bio: collector.bio,
      }
    });

    await prisma.collector.update({
      where: { id: collector.id },
      data: { isPendingExhibitor: false }
    });

    await prisma.notification.create({
      data: {
        title: 'Exhibitor Request Approved',
        message: `Your request to become an exhibitor has been approved. You can now log in as an exhibitor.`,
        target: 'user',
        userId: collector.id,
      }
    });

    try {
      if (collector.email) {
        const { subject, html } = buildNotificationEmail(
          'Exhibitor Request Approved',
          `Your request to become an exhibitor has been approved. You can now log in as an exhibitor and start showcasing your artworks.`,
          collector.name
        );
        await sendEmail([collector.email], subject, html);
      }
    } catch (err) {
      console.error('Failed to send approval email:', err);
    }

    res.json({ message: 'Exhibitor approved and created', exhibitor: newExhibitor });
  } catch (error) {
    console.error('Failed to approve exhibitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/settings', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const admin = await prisma.admin.findFirst({
      select: { paymentEnabled: true, achievementsEnabled: true, collectorRegistrationEnabled: true }
    });
    res.json({
      paymentEnabled: admin?.paymentEnabled ?? true,
      achievementsEnabled: admin?.achievementsEnabled ?? true,
      collectorRegistrationEnabled: admin?.collectorRegistrationEnabled ?? true,
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/settings', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { paymentEnabled, achievementsEnabled, collectorRegistrationEnabled } = req.body;
    const data: any = {};
    if (typeof paymentEnabled === 'boolean') data.paymentEnabled = paymentEnabled;
    if (typeof achievementsEnabled === 'boolean') data.achievementsEnabled = achievementsEnabled;
    if (typeof collectorRegistrationEnabled === 'boolean') data.collectorRegistrationEnabled = collectorRegistrationEnabled;
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No valid settings provided' });
      return;
    }
    const admin = await prisma.admin.findFirst();
    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data,
    });
    res.json({
      paymentEnabled: updated.paymentEnabled,
      achievementsEnabled: updated.achievementsEnabled,
      collectorRegistrationEnabled: updated.collectorRegistrationEnabled,
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/exhibitors/reject/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const collector = await prisma.collector.update({
      where: { id },
      data: { isPendingExhibitor: false }
    });

    await prisma.notification.create({
      data: {
        title: 'Exhibitor Request Rejected',
        message: `Your request to become an exhibitor has been rejected.`,
        target: 'user',
        userId: id,
      }
    });

    const rejectedCollector = await prisma.collector.findUnique({
      where: { id },
      select: { email: true, name: true },
    });
    try {
      if (rejectedCollector?.email) {
        const { subject, html } = buildNotificationEmail(
          'Exhibitor Request Rejected',
          `Your request to become an exhibitor has been rejected. If you have questions, please contact support.`,
          rejectedCollector.name
        );
        await sendEmail([rejectedCollector.email], subject, html);
      }
    } catch (err) {
      console.error('Failed to send rejection email:', err);
    }

    res.json({ message: 'Exhibitor request rejected', collector });
  } catch (error) {
    console.error('Failed to reject exhibitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/reports', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/reports/:id/resolve', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    res.json(report);
  } catch (error) {
    console.error('Failed to resolve report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
