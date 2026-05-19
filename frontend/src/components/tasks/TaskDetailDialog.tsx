import { Circle, CircleDot, Clock, CircleCheck } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { formatDueDate, importanceColor, dueDateBadgeClass } from '@/lib/taskUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_ICON: Record<TaskStatus, React.ElementType> = {
  PENDING: Circle,
  STARTED: CircleDot,
  WAITING: Clock,
  COMPLETED: CircleCheck,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  STARTED: 'Started',
  WAITING: 'Waiting',
  COMPLETED: 'Completed',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  PENDING: 'text-muted-foreground',
  STARTED: 'text-blue-500',
  WAITING: 'text-amber-500',
  COMPLETED: 'text-green-500',
};

const IMPORTANCE_LABEL: Record<string, string> = {
  HIGH: 'High priority',
  MEDIUM: 'Medium priority',
  LOW: 'Low priority',
};

interface Props {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailDialog({ task, open, onClose }: Props) {
  const StatusIcon = STATUS_ICON[task.status];
  const isCompleted = task.status === 'COMPLETED';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className={cn(isCompleted && 'line-through text-muted-foreground')}>
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon className={cn('size-4 shrink-0', STATUS_COLOR[task.status])} />
            <span>{STATUS_LABEL[task.status]}</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {task.dueDate && (
              <Badge variant="outline" className={cn('text-xs', dueDateBadgeClass(task.dueDate))}>
                {formatDueDate(task.dueDate)}
              </Badge>
            )}
            <Badge className={cn('text-xs border-0', importanceColor(task.importance))}>
              {IMPORTANCE_LABEL[task.importance]}
            </Badge>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Added{' '}
            {new Date(task.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
