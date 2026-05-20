import prisma from './prisma';
import logger from './logger';
import { isEnabled, notifyAll } from './telegram';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dueDate: Date): number {
  const today = startOfToday();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

async function checkReminders(): Promise<void> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: { not: null },
      },
    });

    for (const task of tasks) {
      const days = daysUntil(task.dueDate!);
      try {
        if (days === 2 && !task.reminder2DaysSent) {
          await notifyAll(task.title, 'Due in 2 days');
          await prisma.task.update({ where: { id: task.id }, data: { reminder2DaysSent: true } });
        } else if (days === 1 && !task.reminder1DaySent) {
          await notifyAll(task.title, 'Due tomorrow');
          await prisma.task.update({ where: { id: task.id }, data: { reminder1DaySent: true } });
        } else if (days === 0 && !task.reminderTodaySent) {
          await notifyAll(task.title, 'Due TODAY');
          await prisma.task.update({ where: { id: task.id }, data: { reminderTodaySent: true } });
        }
      } catch (err) {
        logger.error({ err, taskId: task.id }, 'Reminder job error for task');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Reminder job failed to query tasks');
  }
}

export function initReminderJob(): void {
  if (!isEnabled()) return;
  logger.info('Telegram reminder job started');
  void checkReminders();
  setInterval(() => { void checkReminders(); }, 60 * 60 * 1000);
}
