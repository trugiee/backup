import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api', authRoutes);
app.use('/api', publicRoutes);
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
    origin: '*',
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
