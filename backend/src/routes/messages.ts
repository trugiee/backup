import { Router, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import prisma from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ggallery_secret_key';

function auth(req: Request, res: Response): any | null {
  const header = req.headers.authorization;
  if (!header) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try {
    return verify(header.replace('Bearer ', ''), JWT_SECRET) as any;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

async function populateArtworks(messages: any[]) {
  const artworkIds = messages.filter(m => m.artworkId).map(m => m.artworkId);
  const artworks = artworkIds.length
    ? await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, select: { id: true, title: true, imageUrl: true } })
    : [];
  const artworkMap = new Map(artworks.map(a => [a.id, a]));
  return messages.map(msg => ({
    ...msg,
    artwork: msg.artworkId ? artworkMap.get(msg.artworkId) || null : null
  }));
}

router.post('/messages', async (req: Request, res: Response) => {
  const user = auth(req, res);
  if (!user) return;

  const { exhibitorId, content, artworkId, artworkType } = req.body;
  if (!exhibitorId || !content?.trim()) {
    res.status(400).json({ error: 'exhibitorId and content are required' });
    return;
  }

  try {
    let collectorId = user.id;
    if (user.role === 'exhibitor') {
      if (user.collectorId) {
        collectorId = user.collectorId;
      } else {
        collectorId = user.id;
      }
    } else if (user.role === 'admin') {
      res.status(403).json({ error: 'Admins cannot send messages' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderRole: 'collector',
        exhibitorId,
        collectorId,
        artworkId: artworkId || null,
        artworkType: artworkType || null,
      },
      include: { collector: { select: { id: true, name: true } }, exhibitor: { select: { id: true, name: true } } },
    });

    const [populated] = await populateArtworks([message]);
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/messages/reply', async (req: Request, res: Response) => {
  const user = auth(req, res);
  if (!user) return;
  if (user.role !== 'exhibitor') { res.status(403).json({ error: 'Only exhibitors can reply' }); return; }

  const { collectorId, content } = req.body;
  if (!collectorId || !content?.trim()) {
    res.status(400).json({ error: 'collectorId and content are required' });
    return;
  }

  try {
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderRole: 'exhibitor',
        exhibitorId: user.id,
        collectorId,
      },
      include: { collector: { select: { id: true, name: true } }, exhibitor: { select: { id: true, name: true } } },
    });
    
    const [populated] = await populateArtworks([message]);
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

router.get('/messages/conversation/:exhibitorId', async (req: Request, res: Response) => {
  const user = auth(req, res);
  if (!user) return;

  let collectorId = user.id;
  if (user.role === 'exhibitor' && user.collectorId) collectorId = user.collectorId;

  try {
    const messages = await prisma.message.findMany({
      where: { exhibitorId: req.params.exhibitorId as string, collectorId },
      orderBy: { createdAt: 'asc' },
      include: {
        collector: { select: { id: true, name: true, profilePicture: true } },
        exhibitor: { select: { id: true, name: true, profilePicture: true } },
      },
    });
    const populated = await populateArtworks(messages);
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/messages/my-conversations', async (req: Request, res: Response) => {
  const user = auth(req, res);
  if (!user) return;

  const collectorId = user.collectorId || user.id;

  try {
    const messages = await prisma.message.findMany({
      where: { collectorId },
      orderBy: { createdAt: 'desc' },
      include: {
        exhibitor: { select: { id: true, name: true, profilePicture: true } },
        collector: { select: { id: true, name: true } },
      },
    });

    const populated = await populateArtworks(messages);

    const threads: Record<string, any> = {};
    for (const msg of populated) {
      if (!threads[msg.exhibitorId]) {
        threads[msg.exhibitorId] = { exhibitor: msg.exhibitor, lastMessage: msg, messages: [] };
      }
      threads[msg.exhibitorId].messages.push(msg);
    }
    for (const t of Object.values(threads)) {
      t.messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    res.json(Object.values(threads));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/messages/inbox', async (req: Request, res: Response) => {
  const user = auth(req, res);
  if (!user) return;
  if (user.role !== 'exhibitor') { res.status(403).json({ error: 'Exhibitors only' }); return; }

  try {
    const messages = await prisma.message.findMany({
      where: { exhibitorId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        collector: { select: { id: true, name: true, profilePicture: true, email: true, bio: true, phone: true, createdAt: true } },
        exhibitor: { select: { id: true, name: true } },
      },
    });

    const populated = await populateArtworks(messages);

    const threads: Record<string, any> = {};
    for (const msg of populated) {
      if (!threads[msg.collectorId]) {
        threads[msg.collectorId] = { collector: msg.collector, lastMessage: msg, unread: 0, messages: [] };
      }
      threads[msg.collectorId].messages.push(msg);
      threads[msg.collectorId].unread += msg.senderRole === 'collector' ? 1 : 0;
    }

    for (const t of Object.values(threads)) {
      t.messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    res.json(Object.values(threads));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

export default router;
