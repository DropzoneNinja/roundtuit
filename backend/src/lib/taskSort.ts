import { Task, Importance, TaskStatus } from '@prisma/client';

const importanceRank: Record<Importance, number> = {
  [Importance.HIGH]: 0,
  [Importance.MEDIUM]: 1,
  [Importance.LOW]: 2,
};

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Completed tasks sink to the bottom
    const aCompleted = a.status === TaskStatus.COMPLETED;
    const bCompleted = b.status === TaskStatus.COMPLETED;
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    // 2. Earlier dueDate first; nulls last
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    }

    // 3. Importance: HIGH > MEDIUM > LOW
    if (a.importance !== b.importance) {
      return importanceRank[a.importance] - importanceRank[b.importance];
    }

    // 4. Newest createdAt first
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
