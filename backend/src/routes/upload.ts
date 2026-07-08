import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import upload from '../lib/upload';

const router = Router();

router.post('/upload', authMiddleware, upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded' });
    return;
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ imageUrl });
});

export default router;
