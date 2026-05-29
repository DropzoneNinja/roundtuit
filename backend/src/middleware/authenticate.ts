import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../lib/prisma';

export interface AuthUser {
  id: string;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      authMethod?: 'jwt' | 'apikey';
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.token) {
    token = req.cookies.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (token.startsWith('rtpat_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: { select: { id: true, username: true } } },
      });

      if (!apiKey) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        res.status(401).json({ error: 'API key has expired' });
        return;
      }

      void prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      req.user = { id: apiKey.user.id, username: apiKey.user.username };
      req.authMethod = 'apikey';
      next();
    } catch {
      res.status(401).json({ error: 'Authentication error' });
    }
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, username: payload.username };
    req.authMethod = 'jwt';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
