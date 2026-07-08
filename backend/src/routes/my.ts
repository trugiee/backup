import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ggallery_secret_key';

const router = Router();

const artworkIncludes = {
  exhibitor: true,
  contributors: { include: { exhibitor: { select: { id: true, name: true } } } },
};

router.get('/my/artworks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can access this endpoint' });
      return;
    }
    const [owned, contributed] = await Promise.all([
      prisma.artwork.findMany({
        where: { exhibitorId: user.id, status: { not: 'Deleted' } },
        orderBy: { createdAt: 'desc' },
        include: artworkIncludes,
      }),
      prisma.artwork.findMany({
        where: { contributors: { some: { exhibitorId: user.id } }, exhibitorId: { not: user.id }, status: { not: 'Deleted' } },
        orderBy: { createdAt: 'desc' },
        include: artworkIncludes,
      }),
    ]);
    const merged = [...owned, ...contributed].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(merged);
  } catch (error) {
    console.error('Error fetching my artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

router.post('/my/artworks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can access this endpoint' });
      return;
    }
    const { contributorIds, ...body } = req.body as any;
    const artwork = await prisma.artwork.create({
      data: {
        ...body,
        exhibitorId: user.id,
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

router.get('/my/sold-artworks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'collector' && !user.collectorId) {
      res.status(403).json({ error: 'Only collectors can access this endpoint' });
      return;
    }
    const collectorId = user.collectorId || user.id;
    const sales = await prisma.soldArtwork.findMany({
      where: { collectorId },
      orderBy: { saleDate: 'desc' },
      include: { artwork: { include: artworkIncludes } },
    });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching my sold artworks:', error);
    res.status(500).json({ error: 'Failed to fetch sold artworks' });
  }
});

router.get('/my/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'exhibitor') {
      res.status(403).json({ error: 'Only exhibitors can access this endpoint' });
      return;
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [statusGroups, typeGroups, recentArtworks, soldArtworks, achievementsCount, totalArtworks] = await Promise.all([
      prisma.artwork.groupBy({
        by: ['status'],
        _count: true,
        where: { exhibitorId: user.id, status: { not: 'Deleted' } },
      }),
      prisma.artwork.groupBy({
        by: ['type'],
        _count: true,
        where: { exhibitorId: user.id, status: { not: 'Deleted' } },
      }),
      prisma.artwork.findMany({
        where: { exhibitorId: user.id, status: { not: 'Deleted' }, createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.soldArtwork.findMany({
        where: { artwork: { exhibitorId: user.id } },
        select: { salePrice: true, saleDate: true, artworkTitle: true },
      }),
      prisma.achievement.count({ where: { exhibitorId: user.id } }),
      prisma.artwork.count({ where: { exhibitorId: user.id, status: { not: 'Deleted' } } }),
    ]);

    const monthLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    const artworksByMonth = monthLabels.map(label => {
      const [month, year] = label.split(' ');
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      const yearNum = parseInt(year);
      return {
        month: label,
        count: recentArtworks.filter(a => {
          const d = new Date(a.createdAt);
          return d.getMonth() === monthIndex && d.getFullYear() === yearNum;
        }).length,
      };
    });

    const salesTotal = soldArtworks.reduce((sum, s) => sum + s.salePrice, 0);
    const avgPrice = soldArtworks.length > 0 ? salesTotal / soldArtworks.length : 0;

    const salesByMonth = monthLabels.map(label => {
      const [month, year] = label.split(' ');
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      const yearNum = parseInt(year);
      const entries = soldArtworks.filter(s => {
        const d = new Date(s.saleDate);
        return d.getMonth() === monthIndex && d.getFullYear() === yearNum;
      });
      return {
        month: label,
        sales: entries.reduce((sum, e) => sum + e.salePrice, 0),
        count: entries.length,
      };
    });

    res.json({
      total: totalArtworks,
      byStatus: statusGroups,
      byType: typeGroups,
      artworksByMonth,
      sales: {
        total: salesTotal,
        averagePrice: avgPrice,
        count: soldArtworks.length,
        byMonth: salesByMonth,
        recent: soldArtworks.slice(-10).reverse(),
      },
      achievements: achievementsCount,
    });
  } catch (error) {
    console.error('Failed to fetch exhibitor stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/my/upgrade-to-exhibitor', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'collector') {
      res.status(403).json({ error: 'Only collectors can upgrade' });
      return;
    }

    const { phone, address } = req.body;

    const collector = await prisma.collector.findUnique({
      where: { id: user.id }
    });

    if (!collector) {
      res.status(404).json({ error: 'Collector not found' });
      return;
    }

    const updatedCollector = await prisma.collector.update({
      where: { id: collector.id },
      data: {
        phone: phone || collector.phone,
        address: address || collector.address,
        isPendingExhibitor: true
      }
    });

    res.json({
      user: {
        id: updatedCollector.id,
        email: updatedCollector.email,
        name: updatedCollector.name,
        role: 'collector',
        profilePicture: updatedCollector.profilePicture,
        bio: updatedCollector.bio,
        isPendingExhibitor: updatedCollector.isPendingExhibitor
      }
    });

  } catch (error) {
    console.error('Error upgrading to exhibitor:', error);
    res.status(500).json({ error: 'Failed to upgrade account' });
  }
});

export default router;
