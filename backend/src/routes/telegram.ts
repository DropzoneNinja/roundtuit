import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.TELEGRAM_BOT_TOKEN) {
      res.json({ enabled: false });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    if (user.telegramChatId) {
      res.json({ enabled: true, linked: true, linkCode: null });
      return;
    }

    let linkCode = user.telegramLinkCode;
    if (!linkCode) {
      linkCode = crypto.randomBytes(4).toString('hex');
      await prisma.user.update({ where: { id: user.id }, data: { telegramLinkCode: linkCode } });
    }

    res.json({ enabled: true, linked: false, linkCode });
  } catch (err) {
    next(err);
  }
});

router.post('/unlink', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { telegramChatId: null, telegramLinkCode: null },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const linkCode = crypto.randomBytes(4).toString('hex');
    await prisma.user.update({ where: { id: req.user!.id }, data: { telegramLinkCode: linkCode } });
    res.json({ linkCode });
  } catch (err) {
    next(err);
  }
});

export default router;
