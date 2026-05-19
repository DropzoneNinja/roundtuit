import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../lib/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    500;
  const message = err instanceof Error ? err.message : 'Internal server error';

  if (status >= 500) {
    logger.error({ err }, 'Unhandled server error');
  }

  res.status(status).json({ error: message });
}
