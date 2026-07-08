import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sign } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { sendEmail, buildNotificationEmail } from '../lib/mail';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ggallery_secret_key';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    let user: any = await prisma.admin.findUnique({ where: { email } });
    let role = 'admin';
    let collectorId = null;
    let isDualRole = false;

    if (!user) {
      user = await prisma.exhibitor.findUnique({ where: { email } });
      if (user) {
        role = 'exhibitor';
        const collector = await prisma.collector.findUnique({ where: { email } });
        if (collector) {
          collectorId = collector.id;
          isDualRole = true;
        }
      }
    }

    if (!user) {
      user = await prisma.collector.findUnique({ where: { email } });
      if (user) {
        role = 'collector';
      }
    }

    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = sign(
      { id: user.id, email: user.email, role, collectorId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role, profilePicture: user.profilePicture || null, bio: user.bio || null, theme: user.theme || 'light', isPendingExhibitor: user.isPendingExhibitor || false, isDualRole } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: 'Google access token is required' });
      return;
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoRes.ok) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }
    const userInfo: any = await userInfoRes.json();

    const googleEmail = userInfo.email;
    const googleName = userInfo.name || googleEmail.split('@')[0];
    const googlePicture = userInfo.picture || null;

    let user: any = await prisma.admin.findUnique({ where: { email: googleEmail } });
    let role = 'admin';
    let collectorId: string | null = null;
    let isDualRole = false;

    if (!user) {
      user = await prisma.exhibitor.findUnique({ where: { email: googleEmail } });
      if (user) role = 'exhibitor';
    }

    if (!user) {
      user = await prisma.collector.findUnique({ where: { email: googleEmail } });
      if (user) role = 'collector';
    }

    if (!user) {
      user = await prisma.collector.create({
        data: {
          name: googleName,
          email: googleEmail,
          profilePicture: googlePicture,
        },
      });
      role = 'collector';
      collectorId = user.id;
    } else {
      if (role === 'collector') {
        collectorId = user.id;
      }
    }

    const token = sign(
      { id: user.id, email: user.email, role, collectorId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role, profilePicture: user.profilePicture || googlePicture, bio: user.bio || null, theme: user.theme || 'light', isPendingExhibitor: user.isPendingExhibitor || false, isDualRole } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/theme', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { theme } = req.body;
    if (!theme || !['light', 'dark'].includes(theme)) {
      res.status(400).json({ error: 'Theme must be "light" or "dark"' });
      return;
    }
    const authUser = (req as any).user as { id: string; email: string; role: string };

    if (authUser.role === 'admin') {
      await prisma.admin.update({ where: { id: authUser.id }, data: { theme } });
    } else if (authUser.role === 'exhibitor') {
      await prisma.exhibitor.update({ where: { id: authUser.id }, data: { theme } });
    } else if (authUser.role === 'collector') {
      await prisma.collector.update({ where: { id: authUser.id }, data: { theme } });
    }

    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register/collector', async (req: Request, res: Response) => {
  try {
    const admin = await prisma.admin.findFirst({ select: { collectorRegistrationEnabled: true } });
    if (admin?.collectorRegistrationEnabled === false) {
      res.status(403).json({ error: 'Collector registration is currently disabled by the admin.' });
      return;
    }

    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    const existingCollector = await prisma.collector.findUnique({ where: { email } });
    const existingExhibitor = await prisma.exhibitor.findUnique({ where: { email } });

    if (existingAdmin || existingCollector || existingExhibitor) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCollector = await prisma.collector.create({
      data: { name, email, password: hashedPassword, phone, address },
    });

    const token = sign(
      { id: newCollector.id, email: newCollector.email, role: 'collector' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: { id: newCollector.id, email: newCollector.email, name: newCollector.name, role: 'collector', profilePicture: newCollector.profilePicture || null, bio: newCollector.bio || null, theme: newCollector.theme || 'light', isPendingExhibitor: newCollector.isPendingExhibitor || false } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Old password and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const authUser = (req as any).user as { id: string; email: string; role: string };
    let user: any = null;

    if (authUser.role === 'admin') {
      user = await prisma.admin.findUnique({ where: { id: authUser.id } });
    } else if (authUser.role === 'exhibitor') {
      user = await prisma.exhibitor.findUnique({ where: { id: authUser.id } });
    } else if (authUser.role === 'collector') {
      user = await prisma.collector.findUnique({ where: { id: authUser.id } });
    }

    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (authUser.role === 'admin') {
      await prisma.admin.update({ where: { id: authUser.id }, data: { password: hashedPassword } });
    } else if (authUser.role === 'exhibitor') {
      await prisma.exhibitor.update({ where: { id: authUser.id }, data: { password: hashedPassword } });
    } else if (authUser.role === 'collector') {
      await prisma.collector.update({ where: { id: authUser.id }, data: { password: hashedPassword } });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/change-email', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) {
      res.status(400).json({ error: 'New email is required' });
      return;
    }

    const authUser = (req as any).user as { id: string; email: string; role: string };

    const existingAdmin = await prisma.admin.findUnique({ where: { email: newEmail } });
    const existingCollector = await prisma.collector.findUnique({ where: { email: newEmail } });
    const existingExhibitor = await prisma.exhibitor.findUnique({ where: { email: newEmail } });

    if (existingAdmin || existingCollector || existingExhibitor) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    if (authUser.role === 'admin') {
      await prisma.admin.update({ where: { id: authUser.id }, data: { email: newEmail } });
    } else if (authUser.role === 'exhibitor') {
      await prisma.exhibitor.update({ where: { id: authUser.id }, data: { email: newEmail } });
      const collector = await prisma.collector.findUnique({ where: { email: authUser.email } });
      if (collector) {
        await prisma.collector.update({ where: { id: collector.id }, data: { email: newEmail } });
      }
    } else if (authUser.role === 'collector') {
      await prisma.collector.update({ where: { id: authUser.id }, data: { email: newEmail } });
      const exhibitor = await prisma.exhibitor.findUnique({ where: { email: authUser.email } });
      if (exhibitor) {
        await prisma.exhibitor.update({ where: { id: exhibitor.id }, data: { email: newEmail } });
      }
    }

    res.json({ message: 'Email changed successfully' });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    let user: any = await prisma.admin.findUnique({ where: { email } });
    let role: string | null = user ? 'admin' : null;

    if (!user) {
      user = await prisma.exhibitor.findUnique({ where: { email } });
      role = user ? 'exhibitor' : null;
    }

    if (!user) {
      user = await prisma.collector.findUnique({ where: { email } });
      role = user ? 'collector' : null;
    }

    if (!user || !user.password) {
      res.json({ message: 'If that email exists, a new password has been sent.' });
      return;
    }

    const newPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (role === 'admin') {
      await prisma.admin.update({ where: { id: user.id }, data: { password: hashedPassword } });
    } else if (role === 'exhibitor') {
      await prisma.exhibitor.update({ where: { id: user.id }, data: { password: hashedPassword } });
    } else if (role === 'collector') {
      await prisma.collector.update({ where: { id: user.id }, data: { password: hashedPassword } });
    }

    const { subject, html } = buildNotificationEmail(
      'Password Reset',
      `Your password has been reset. Here is your new temporary password:<br/><br/>
       <div style="background:#18181b;color:white;padding:12px 20px;border-radius:8px;font-size:24px;font-weight:800;letter-spacing:2px;text-align:center;font-family:monospace;">${newPassword}</div><br/>
       Please sign in and change your password immediately.`,
      user.name
    );

    sendEmail([email], subject, html).catch(err => console.error('Forgot password async email error:', err));

    res.json({ message: 'If that email exists, a new password has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
