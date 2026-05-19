import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { registerSchema, loginSchema } from '../schemas/auth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

function setAuthCookie(res: Response, userId: string, username: string): void {
  const token = jwt.sign({ id: userId, username }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const isProd = config.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    const allowed = await prisma.allowedUsername.findUnique({ where: { username: body.username } });
    if (!allowed) {
      res.status(403).json({ error: 'Username not on the allowed list' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      res.status(409).json({ error: 'Account already exists' });
      return;
    }

    const passwordHash = await argon2.hash(body.password);
    const user = await prisma.user.create({ data: { username: body.username, passwordHash } });

    setAuthCookie(res, user.id, user.username);
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username: body.username } });
    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    setAuthCookie(res, user.id, user.username);
    res.json({ id: user.id, username: user.username, passwordChangeRequired: user.passwordChangeRequired });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.status(204).send();
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, username: true, passwordChangeRequired: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
