import type { Task, Importance } from '@/types';

const importanceRank: Record<Importance, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export interface TaskGroup {
  label: string;
  tasks: Task[];
}

function utcMidnight(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function groupIncompleteTasks(tasks: Task[]): TaskGroup[] {
  const today = utcMidnight(new Date());
  const tomorrow = addDays(today, 1);

  // ISO week: Mon=1 … Sun=7; getUTCDay returns Sun=0
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfThisWeek = addDays(today, -daysFromMonday);
  const endOfThisWeek = addDays(startOfThisWeek, 6);
  const startOfNextWeek = addDays(endOfThisWeek, 1);
  const endOfNextWeek = addDays(startOfNextWeek, 6);

  const buckets: Record<string, Task[]> = {
    'Past Due': [],
    Today: [],
    Tomorrow: [],
    'This Week': [],
    'Next Week': [],
    Other: [],
  };

  for (const task of tasks) {
    if (!task.dueDate) {
      buckets['Other'].push(task);
      continue;
    }
    const due = utcMidnight(new Date(task.dueDate));
    const t = due.getTime();
    if (t < today.getTime()) {
      buckets['Past Due'].push(task);
    } else if (t === today.getTime()) {
      buckets['Today'].push(task);
    } else if (t === tomorrow.getTime()) {
      buckets['Tomorrow'].push(task);
    } else if (t <= endOfThisWeek.getTime()) {
      buckets['This Week'].push(task);
    } else if (t <= endOfNextWeek.getTime()) {
      buckets['Next Week'].push(task);
    } else {
      buckets['Other'].push(task);
    }
  }

  const order = ['Past Due', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'Other'] as const;
  return order.filter((label) => buckets[label].length > 0).map((label) => ({ label, tasks: buckets[label] }));
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aCompleted = a.status === 'COMPLETED';
    const bCompleted = b.status === 'COMPLETED';
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (a.importance !== b.importance) {
      return importanceRank[a.importance] - importanceRank[b.importance];
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function formatDueDate(dateStr: string): string {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const dateUTC = new Date(dateStr);
  dateUTC.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function dueDateBadgeClass(dateStr: string): string {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const dateUTC = new Date(dateStr);
  dateUTC.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0)
    return 'border-red-300 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-400';
  if (diffDays === 0)
    return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400';
  return '';
}

export function formatStatusDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function importanceColor(importance: Importance): string {
  switch (importance) {
    case 'HIGH':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'LOW':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}
