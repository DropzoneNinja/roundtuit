import { config } from '../config';
import prisma from './prisma';
import logger from './logger';

const BASE = () => `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export function isEnabled(): boolean {
  return !!config.TELEGRAM_BOT_TOKEN;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendNotification(chatId: string, text: string): Promise<void> {
  try {
    await fetch(`${BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    logger.error({ err, chatId }, 'Telegram sendMessage failed');
  }
}

export async function notifyOthers(actorId: string, taskTitle: string, message: string): Promise<void> {
  if (!isEnabled()) return;
  const users = await prisma.user.findMany({
    where: { id: { not: actorId }, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  const text = `TUIT: ${message}: <b>${escapeHtml(taskTitle)}</b>`;
  await Promise.allSettled(users.map(u => sendNotification(u.telegramChatId!, text)));
}

export async function notifyAll(taskTitle: string, message: string): Promise<void> {
  if (!isEnabled()) return;
  const users = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  const text = `TUIT: ${message}: <b>${escapeHtml(taskTitle)}</b>`;
  await Promise.allSettled(users.map(u => sendNotification(u.telegramChatId!, text)));
}

async function pollOnce(offset: number): Promise<number> {
  const res = await fetch(`${BASE()}/getUpdates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset, timeout: 0, allowed_updates: ['message'] }),
  });
  const data = await res.json() as { ok: boolean; result: Array<{ update_id: number; message?: { text?: string; chat: { id: number } } }> };
  if (!data.ok || !data.result.length) return offset;

  for (const update of data.result) {
    const text = update.message?.text?.trim() ?? '';
    if (text) {
      const user = await prisma.user.findFirst({ where: { telegramLinkCode: text } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: String(update.message!.chat.id), telegramLinkCode: null },
        });
        await sendNotification(
          String(update.message!.chat.id),
          '✓ Your Telegram account is now linked to RoundTuit.',
        );
        logger.info({ userId: user.id }, 'Telegram account linked');
      }
    }
  }

  return data.result[data.result.length - 1].update_id + 1;
}

export function initTelegramPolling(): void {
  if (!isEnabled()) {
    logger.info('Telegram not configured — notifications disabled');
    return;
  }
  logger.info('Telegram polling started');
  let offset = 0;
  setInterval(async () => {
    try {
      offset = await pollOnce(offset);
    } catch (err) {
      logger.error({ err }, 'Telegram poll error');
    }
  }, 5000);
}
