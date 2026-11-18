import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import uploadRoutes from './routes/upload';
import artworkRoutes from './routes/artworks';
import collectorRoutes from './routes/collectors';
import exhibitorRoutes from './routes/exhibitors';
import myRoutes from './routes/my';
import soldArtworkRoutes from './routes/soldArtworks';
import achievementRoutes from './routes/achievements';
import adminRoutes from './routes/admin';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import paymentRoutes from './routes/payments';
import aiRoutes from './routes/ai';
import reportRoutes from './routes/reports';
import appUpdateRoutes from './routes/appUpdate';
import prisma from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

// Behind a TLS-terminating proxy the OTA endpoint must hand back an https bundle
// URL, otherwise req.protocol reports http and the download is blocked.
app.set('trust proxy', true);

// Browsers may only call the API from these origins. Set FRONTEND_URL (comma
// separated for several sites). The Android app's WebView origins are always allowed.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .concat(['https://localhost', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173']);

if (!process.env.FRONTEND_URL) {
  console.warn('FRONTEND_URL is not set: CORS is open to every origin.');
}

export const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  // No Origin header = non-browser client (curl, server-to-server, webhooks).
  if (!origin || !process.env.FRONTEND_URL || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

app.use(cors({ origin: corsOrigin }));

// Keep the raw body so the PayMongo webhook signature can be verified.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

// Slow down password guessing and email spam on the auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});
app.use(
  ['/api/login', '/api/auth/google', '/api/register', '/api/forgot-password', '/api/auth/change-password'],
  authLimiter
);

const uploadDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// OTA bundles. Filenames embed the bundle version, so they are immutable.
const updatesDir = path.join(process.cwd(), 'updates');
app.use(
  '/api/updates',
  express.static(updatesDir, { maxAge: '365d', immutable: true, fallthrough: false })
);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Touches the database so Supabase doesn't pause the project for inactivity.
// Called daily by .github/workflows/keepalive.yml.
app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', appUpdateRoutes);
app.use('/api', uploadRoutes);
app.use('/api', artworkRoutes);
app.use('/api', collectorRoutes);
app.use('/api', exhibitorRoutes);
app.use('/api', myRoutes);
app.use('/api', soldArtworkRoutes);
app.use('/api', achievementRoutes);
app.use('/api', adminRoutes);
app.use('/api', messageRoutes);
app.use('/api', notificationRoutes);
app.use('/api', paymentRoutes);
app.use('/api', aiRoutes);
app.use('/api', reportRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin as any,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
