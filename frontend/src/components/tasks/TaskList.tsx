import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { groupIncompleteTasks } from '@/lib/taskUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TaskCard } from './TaskCard';

function groupBoxClass(label: string): string {
  switch (label) {
    case 'Past Due':
      return 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20';
    case 'Today':
      return 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20';
    case 'Tomorrow':
      return 'border-yellow-200 bg-yellow-50/60 dark:border-yellow-900/50 dark:bg-yellow-950/20';
    case 'This Week':
      return 'border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20';
    case 'Next Week':
      return 'border-violet-200 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20';
    default:
      return 'border-border bg-muted/30 dark:bg-muted/10';
  }
}

function groupLabelClass(label: string): string {
  switch (label) {
    case 'Past Due':
      return 'text-red-500 dark:text-red-400';
    case 'Today':
      return 'text-amber-600 dark:text-amber-400';
    case 'Tomorrow':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'This Week':
      return 'text-blue-600 dark:text-blue-400';
    case 'Next Week':
      return 'text-violet-600 dark:text-violet-400';
    default:
      return 'text-muted-foreground';
  }
}

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewDetail: (task: Task) => void;
}

export function TaskList({
  tasks,
  isLoading,
  isError,
  onRetry,
  onStatusChange,
  onEdit,
  onDelete,
  onViewDetail,
}: TaskListProps) {
  const [completedOpen, setCompletedOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-muted-foreground text-sm">Failed to load tasks</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      </div>
    );
  }

  const incomplete = tasks.filter((t) => t.status !== 'COMPLETED');
  const complete = tasks.filter((t) => t.status === 'COMPLETED');
  const groups = groupIncompleteTasks(incomplete);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No tasks yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Tap the + button to add your first task
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ label, tasks: groupTasks }) => (
        <div key={label} className={cn('rounded-xl border p-3 space-y-2', groupBoxClass(label))}>
          <p className={cn('text-xs font-semibold uppercase tracking-wider px-1', groupLabelClass(label))}>
            {label}
          </p>
          {groupTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showDaysLeft={label === 'This Week'}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      ))}

      {complete.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 dark:bg-muted/10 p-3">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground w-full hover:text-foreground transition-colors"
            onClick={() => setCompletedOpen((v) => !v)}
            aria-expanded={completedOpen}
            aria-label={`${completedOpen ? 'Collapse' : 'Expand'} completed tasks (${complete.length})`}
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', completedOpen && 'rotate-180')}
            />
            Completed ({complete.length})
          </button>
          {completedOpen && (
            <div className="space-y-2 mt-2">
              {complete.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
