import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { createTaskSchema, updateTaskSchema } from '../schemas/task';
import { sortTasks } from '../lib/taskSort';

const router = Router();

router.use(authenticate);

router.get('/sparklines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Build 28-day window, oldest first, each entry = start-of-day
    const days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 27 + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const tasks = await prisma.task.findMany();

    const endOf = (d: Date) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };

    const created = days.map(day => {
      const end = endOf(day);
      return tasks.filter(t => t.createdAt >= day && t.createdAt <= end).length;
    });

    // Cumulative totals — how many tasks/completions existed as of each day
    const total = days.map(day => {
      const end = endOf(day);
      return tasks.filter(t => t.createdAt <= end).length;
    });

    const completedTotal = days.map(day => {
      const end = endOf(day);
      return tasks.filter(t => t.status === 'COMPLETED' && t.statusChangedAt && t.statusChangedAt <= end).length;
    });

    const open = days.map(day => {
      const end = endOf(day);
      return tasks.filter(t =>
        t.createdAt <= end &&
        (t.status !== 'COMPLETED' || !t.statusChangedAt || t.statusChangedAt > end),
      ).length;
    });

    const completed = days.map(day => {
      const end = endOf(day);
      return tasks.filter(
        t => t.status === 'COMPLETED' && t.statusChangedAt && t.statusChangedAt >= day && t.statusChangedAt <= end,
      ).length;
    });

    const onTime = days.map(day => {
      const end = endOf(day);
      return tasks.filter(
        t => t.status === 'COMPLETED' && t.statusChangedAt && t.dueDate &&
          t.statusChangedAt >= day && t.statusChangedAt <= end &&
          t.statusChangedAt <= t.dueDate,
      ).length;
    });

    const late = days.map(day => {
      const end = endOf(day);
      return tasks.filter(
        t => t.status === 'COMPLETED' && t.statusChangedAt && t.dueDate &&
          t.statusChangedAt >= day && t.statusChangedAt <= end &&
          t.statusChangedAt > t.dueDate,
      ).length;
    });

    const overdue = days.map(day => {
      const end = endOf(day);
      return tasks.filter(
        t => t.dueDate && t.dueDate <= end &&
          t.createdAt <= end &&
          (t.status !== 'COMPLETED' || !t.statusChangedAt || t.statusChangedAt > end),
      ).length;
    });

    const completionRate = days.map(day => {
      const end = endOf(day);
      const total = tasks.filter(t => t.createdAt <= end).length;
      const done  = tasks.filter(t => t.status === 'COMPLETED' && t.statusChangedAt && t.statusChangedAt <= end).length;
      return total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    });

    const importanceDaily = (imp: string) =>
      days.map(day => {
        const end = endOf(day);
        return tasks.filter(t => t.importance === imp && t.createdAt >= day && t.createdAt <= end).length;
      });

    res.json({
      total,
      created,
      open,
      completed,
      completedTotal,
      onTime,
      late,
      overdue,
      completionRate,
      byImportance: {
        HIGH:   importanceDaily('HIGH'),
        MEDIUM: importanceDaily('MEDIUM'),
        LOW:    importanceDaily('LOW'),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

    const windowStart = new Date(months[0].year, months[0].month - 1, 1);
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdAt: { gte: windowStart } },
          { statusChangedAt: { gte: windowStart } },
        ],
      },
    });

    const data = months.map(({ year, month }) => {
      const label = new Date(year, month - 1).toLocaleString('default', { month: 'short', year: '2-digit' });

      const created = tasks.filter(t => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      const completed = tasks.filter(
        t =>
          t.status === 'COMPLETED' &&
          t.statusChangedAt &&
          new Date(t.statusChangedAt).getFullYear() === year &&
          new Date(t.statusChangedAt).getMonth() + 1 === month,
      );

      const withDue = completed.filter(t => t.dueDate && t.statusChangedAt);
      const onTime = withDue.filter(t => t.statusChangedAt! <= t.dueDate!);

      const avgDays =
        completed.length > 0
          ? Math.round(
              (completed.reduce((sum, t) => {
                if (!t.statusChangedAt) return sum;
                return sum + (t.statusChangedAt.getTime() - t.createdAt.getTime()) / 86_400_000;
              }, 0) /
                completed.length) *
                10,
            ) / 10
          : null;

      return {
        month: label,
        created: created.length,
        completed: completed.length,
        onTime: onTime.length,
        late: withDue.length - onTime.length,
        avgDays,
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const tasks = await prisma.task.findMany();
    const completed = tasks.filter(t => t.status === 'COMPLETED');
    const open = tasks.filter(t => t.status !== 'COMPLETED');
    const withDueDate = completed.filter(t => t.dueDate && t.statusChangedAt);

    res.json({
      total: tasks.length,
      open: open.length,
      completed: completed.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 1000) / 10 : 0,
      completedOnTime: withDueDate.filter(t => t.statusChangedAt! <= t.dueDate!).length,
      completedLate: withDueDate.filter(t => t.statusChangedAt! > t.dueDate!).length,
      overdue: open.filter(t => t.dueDate && t.dueDate < now).length,
      byStatus: {
        PENDING: tasks.filter(t => t.status === 'PENDING').length,
        STARTED: tasks.filter(t => t.status === 'STARTED').length,
        WAITING: tasks.filter(t => t.status === 'WAITING').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
      },
      byImportance: {
        HIGH: tasks.filter(t => t.importance === 'HIGH').length,
        MEDIUM: tasks.filter(t => t.importance === 'MEDIUM').length,
        LOW: tasks.filter(t => t.importance === 'LOW').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(sortTasks(tasks));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        ...body,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const statusChangedAt =
      body.status !== undefined && body.status !== existing.status ? new Date() : undefined;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        ...(statusChangedAt !== undefined ? { statusChangedAt } : {}),
      },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
