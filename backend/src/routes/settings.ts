import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { passwordSchema } from '../schemas/auth';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';
import { createBackup, listBackups, resolveBackupPath, deleteBackup, restoreFromPath } from '../lib/backup';
import { getAutoBackupConfig, setAutoBackupConfig } from '../lib/autoBackup';

const router = Router();

router.use(authenticate);

// ── Users ────────────────────────────────────────────────────────────────────

router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, passwordChangeRequired: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

const resetPasswordSchema = z.object({ userId: z.string().min(1) });

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = resetPasswordSchema.parse(req.body);

    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Use change-password to update your own password' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangeRequired: true },
    });

    res.json({ tempPassword, username: target.username });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangeRequired: false },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Backups ──────────────────────────────────────────────────────────────────

router.get('/backups', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [backups, autoBackup] = await Promise.all([listBackups(), getAutoBackupConfig()]);
    res.json({ backups, autoBackup });
  } catch (err) {
    next(err);
  }
});

router.post('/backups', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = await createBackup();
    const backups = await listBackups();
    res.json({ filename, backups });
  } catch (err) {
    next(err);
  }
});

router.get('/backups/:filename/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename as string;
    const filepath = await resolveBackupPath(filename);
    res.download(filepath, filename);
  } catch (err) {
    next(err);
  }
});

router.delete('/backups/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteBackup(req.params.filename as string);
    const backups = await listBackups();
    res.json({ backups });
  } catch (err) {
    next(err);
  }
});

const autoBackupSchema = z.object({
  schedule: z.enum(['disabled', 'daily', 'weekly']),
  hour: z.coerce.number().int().min(0).max(23),
});

router.put('/backups/auto', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = autoBackupSchema.parse(req.body);
    await setAutoBackupConfig(cfg);
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});

// ── Restore ──────────────────────────────────────────────────────────────────

// Restore from an existing backup in the backup directory
const restoreFromBackupSchema = z.object({ filename: z.string().min(1) });

router.post('/restore/from-backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = restoreFromBackupSchema.parse(req.body);
    const filepath = await resolveBackupPath(filename);
    await restoreFromPath(filepath);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Restore from an uploaded SQL file (sent as plain text)
router.post(
  '/restore/upload',
  (req: Request, res: Response, next: NextFunction) => {
    // Accept text/plain or application/octet-stream for the raw SQL
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('text/plain') && !contentType.includes('application/octet-stream')) {
      res.status(400).json({ error: 'Expected Content-Type: text/plain' });
      return;
    }
    next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sql = req.body as string;
      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        res.status(400).json({ error: 'Empty file uploaded' });
        return;
      }

      await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });
      const tmpPath = path.join(config.BACKUP_DIR, `restore-upload-${Date.now()}.sql`);

      try {
        await fs.promises.writeFile(tmpPath, sql, 'utf-8');
        await restoreFromPath(tmpPath);
      } finally {
        await fs.promises.unlink(tmpPath).catch(() => undefined);
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Audit log ─────────────────────────────────────────────────────────────────

router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const cursor = req.query.cursor as string | undefined;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    res.json({ logs, nextCursor: hasMore ? logs[logs.length - 1].id : null });
  } catch (err) {
    next(err);
  }
});

export default router;
