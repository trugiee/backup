import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function buildGalleryContext(): Promise<string> {
  const [artworks, exhibitors, soldCount] = await Promise.all([
    prisma.artwork.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { exhibitor: { select: { name: true } } },
    }),
    prisma.exhibitor.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { artworks: true, achievements: true } } },
    }),
    prisma.soldArtwork.count(),
  ]);

  const totalArtworks = artworks.length;
  const totalExhibitors = exhibitors.length;
  const types = [...new Set(artworks.map(a => a.type))];
  const styles = [...new Set(artworks.map(a => a.style).filter(Boolean))];

  let ctx = `Gallery Overview:\n`;
  ctx += `- Total artworks: ${totalArtworks}\n`;
  ctx += `- Total artists (exhibitors): ${totalExhibitors}\n`;
  ctx += `- Artworks sold: ${soldCount}\n`;
  ctx += `- Art types: ${types.join(', ') || 'N/A'}\n`;
  ctx += `- Art styles: ${styles.join(', ') || 'N/A'}\n\n`;

  artworks.slice(0, 15).forEach((a, i) => {
    ctx += `${i + 1}. "${a.title}" (${a.type}${a.style ? ', ' + a.style : ''})`;
    if (a.exhibitor?.name) ctx += ` by ${a.exhibitor.name}`;
    if (a.yearCreated) ctx += `, ${a.yearCreated}`;
    ctx += ` — ${a.status}${a.price ? ', ₱' + a.price.toLocaleString() : ''}\n`;
  });
  if (artworks.length > 15) ctx += `... and ${artworks.length - 15} more artworks.\n`;

  exhibitors.slice(0, 20).forEach((e, i) => {
    ctx += `\nArtist: ${e.name} — ${e._count.artworks} artworks, ${e._count.achievements} achievements`;
    if (e.bio) ctx += ` — ${e.bio}`;
  });

  return ctx;
}

router.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const galleryContext = await buildGalleryContext();

    const systemPrompt = `You are "Mugna", a knowledgeable and passionate museum curator for GGallery, an online art gallery and marketplace in the Philippines. Your personality is warm, articulate, and deeply appreciative of art.

You have access to the current gallery catalog below. Use it to answer visitors' questions about artworks, artists, art styles, and the gallery. If a visitor asks about something not in the catalog, politely say you only have information about the current gallery collection.

Keep responses concise but insightful (2-4 sentences typically). Be enthusiastic about art. If someone wants to buy or inquire about an artwork, guide them to use the app's messaging feature to contact the artist.

Never make up artwork details — only use what's provided in the context. If you don't know something, say so.

Current gallery data:
${galleryContext}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      systemInstruction: systemPrompt,
    });

    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role === 'user' || h.role === 'assistant') {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }],
          });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    res.json({ reply: text });
  } catch (err: any) {
    console.error('AI chat error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'AI chat failed' });
  }
});

export default router;
