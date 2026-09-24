import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const cache = new Map<string, { expiresAt: number; data: unknown }>();

function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) cache.delete(key);
  return undefined;
}

function setCached(key: string, data: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

function toInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

router.get('/public/artworks', async (req: Request, res: Response) => {
  const take = toInt(req.query.take, 24, 1, 100);
  const skip = toInt(req.query.skip, 0, 0, Number.MAX_SAFE_INTEGER);

  const cacheKey = `public-artworks:${take}:${skip}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json(cached);
  }

  try {
    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where: { status: 'Available' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          yearCreated: true,
          style: true,
          description: true,
          price: true,
          status: true,
          imageUrl: true,
          attributes: true,
          media: true,
          createdAt: true,
          exhibitor: {
            select: { id: true, name: true, profilePicture: true },
          },
          contributors: {
            select: {
              exhibitor: { select: { id: true, name: true } },
            },
          },
        },
        take,
        skip,
      }),
      prisma.artwork.count({ where: { status: 'Available' } }),
    ]);

    const payload = { artworks, total, hasMore: skip + artworks.length < total };
    setCached(cacheKey, payload);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.json(payload);
  } catch (error) {
    console.error('Error fetching public artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

export default router;