import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { passwordSchema } from '../schemas/auth';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';
import { createBackup, listBackups, resolveBackupPath, deleteBackup, restoreFromPath } from '../lib/backup';
import { getAutoBackupConfig, setAutoBackupConfig } from '../lib/autoBackup';
import { writeAudit } from '../lib/audit';

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

// Restore from an uploaded .zip backup file
const restoreUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
      cb(null, config.BACKUP_DIR);
    },
    filename: (_req, _file, cb) => cb(null, `restore-upload-${Date.now()}.zip`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.zip')) cb(null, true);
    else cb(new Error('Only .zip backup files are accepted'));
  },
});

router.post('/restore/upload', (req: Request, res: Response, next: NextFunction) => {
  restoreUpload.single('backup')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) { next(err); return; }
    void handleRestoreUpload(req as Request & { file?: Express.Multer.File }, res, next);
  });
});

async function handleRestoreUpload(
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    await restoreFromPath(req.file.path);
    res.json({ success: true });
  } catch (err) {
    next(err);
  } finally {
    await fs.promises.unlink(req.file.path).catch(() => undefined);
  }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

router.post('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, expiresAt } = createApiKeySchema.parse(req.body);

    const rawToken = 'rtpat_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const prefix = rawToken.slice(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user!.id,
        name,
        keyHash,
        prefix,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    void writeAudit('CREATE', 'apiKey', apiKey.id, req.user!.id, req.user!.username, { name });

    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      token: rawToken,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

router.delete('/api-keys/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.apiKey.findUnique({ where: { id: req.params.id } });

    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    await prisma.apiKey.delete({ where: { id: req.params.id } });

    void writeAudit('DELETE', 'apiKey', req.params.id, req.user!.id, req.user!.username, { name: existing.name });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

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
