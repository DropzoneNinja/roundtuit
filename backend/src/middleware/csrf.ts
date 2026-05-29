import { Request, Response, NextFunction } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (MUTATING_METHODS.has(req.method)) {
    const hasBearerToken = req.headers.authorization?.startsWith('Bearer ');
    if (!hasBearerToken && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }
  next();
}
