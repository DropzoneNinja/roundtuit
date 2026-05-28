import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Circle, CircleDot, Clock, CircleCheck, ZoomIn, X } from 'lucide-react';
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={cn(isCompleted && 'line-through text-muted-foreground')}>
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {task.imageUrl && (
            <div
              className="-mx-4 -mt-2 mb-1 relative group cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={task.imageUrl}
                alt={task.title}
                className="w-full max-h-72 object-contain bg-muted"
              />
              <button
                type="button"
                className="absolute bottom-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/50 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onClick={() => setLightboxOpen(true)}
                aria-label="View full size"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <StatusIcon className={cn('size-4 shrink-0', STATUS_COLOR[task.status])} />
            <span>{STATUS_LABEL[task.status]}</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {task.dueDate && (
              <Badge variant="outline" className={cn('text-xs', dueDateBadgeClass(task.dueDate, task.status === 'COMPLETED' ? task.statusChangedAt : null))}>
                {formatDueDate(task.dueDate, task.status === 'COMPLETED' ? task.statusChangedAt : null)}
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

    {lightboxOpen && task.imageUrl && createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 cursor-zoom-out"
        onClick={() => setLightboxOpen(false)}
      >
        <img
          src={task.imageUrl}
          alt={task.title}
          className="max-w-[90vw] max-h-[90vh] object-contain cursor-default rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          onClick={() => setLightboxOpen(false)}
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>,
      document.body,
    )}
    </>
  );
}
