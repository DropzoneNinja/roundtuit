import { useState } from 'react';
import type { Task } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { importanceColor } from '@/lib/taskUtils';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskDetailDialog } from './TaskDetailDialog';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildTaskMap(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    // dueDate is stored as UTC "YYYY-MM-DD…" — slice to date portion for lookup
    const key = task.dueDate.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  return map;
}

function getMonthCells(year: number, month: number): (Date | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay(); // 0 = Sunday
  const cells: (Date | null)[] = Array<null>(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MonthGridProps {
  year: number;
  month: number;
  taskMap: Map<string, Task[]>;
  todayKey: string;
  onTaskClick: (task: Task) => void;
}

function MonthGrid({ year, month, taskMap, todayKey, onTaskClick }: MonthGridProps) {
  const cells = getMonthCells(year, month);

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-center mb-2">
        {MONTH_NAMES[month]} {year}
      </p>

      <div className="grid grid-cols-7">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded overflow-hidden">
        {cells.map((date, i) => {
          const key = date ? dateKey(date) : null;
          const tasks = key ? (taskMap.get(key) ?? []) : [];
          const isToday = key === todayKey;

          return (
            <div
              key={i}
              className={cn(
                'bg-background min-h-16 p-0.5',
                !date && 'bg-muted/20',
                isToday && 'bg-accent/50',
              )}
            >
              {date && (
                <>
                  <span
                    className={cn(
                      'text-[11px] inline-flex items-center justify-center w-5 h-5 rounded-full mb-0.5',
                      isToday
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="space-y-px">
                    {tasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          'w-full text-left text-[10px] leading-tight px-1 py-px rounded-sm truncate block',
                          task.status === 'COMPLETED'
                            ? 'bg-muted text-muted-foreground line-through opacity-60'
                            : importanceColor(task.importance),
                        )}
                      >
                        {task.title}
                      </button>
                    ))}
                    {tasks.length > 3 && (
                      <p className="text-[10px] text-muted-foreground px-1">
                        +{tasks.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarDialog({ open, onOpenChange }: Props) {
  const { data: tasks = [] } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const now = new Date();
  const y1 = now.getFullYear();
  const m1 = now.getMonth();
  const m2 = m1 === 11 ? 0 : m1 + 1;
  const y2 = m1 === 11 ? y1 + 1 : y1;

  const taskMap = buildTaskMap(tasks);
  const todayKey = dateKey(now);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-6">
            <MonthGrid
              year={y1}
              month={m1}
              taskMap={taskMap}
              todayKey={todayKey}
              onTaskClick={setSelectedTask}
            />
            <MonthGrid
              year={y2}
              month={m2}
              taskMap={taskMap}
              todayKey={todayKey}
              onTaskClick={setSelectedTask}
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
