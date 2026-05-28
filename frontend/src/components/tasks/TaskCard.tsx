import { Pencil, Trash2, Circle, CircleDot, Clock, CircleCheck } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { formatDueDate, importanceColor, dueDateBadgeClass, formatStatusDate } from '@/lib/taskUtils';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  showDaysLeft?: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewDetail: (task: Task) => void;
}

const STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  icon: React.ElementType;
  triggerClass: string;
  itemClass?: string;
}> = {
  PENDING: {
    label: 'Pending',
    icon: Circle,
    triggerClass: 'text-muted-foreground hover:text-foreground',
  },
  STARTED: {
    label: 'Started',
    icon: CircleDot,
    triggerClass: 'text-blue-500 hover:text-blue-600',
  },
  WAITING: {
    label: 'Waiting',
    icon: Clock,
    triggerClass: 'text-amber-500 hover:text-amber-600',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CircleCheck,
    triggerClass: 'text-green-500 hover:text-green-600',
  },
};

const importanceLabel: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const importanceFullLabel: Record<string, string> = {
  HIGH: 'High priority',
  MEDIUM: 'Medium priority',
  LOW: 'Low priority',
};

const STATUS_ORDER: TaskStatus[] = ['PENDING', 'STARTED', 'WAITING', 'COMPLETED'];

export function TaskCard({ task, showDaysLeft, onStatusChange, onEdit, onDelete, onViewDetail }: TaskCardProps) {
  const current = STATUS_CONFIG[task.status];
  const CurrentIcon = current.icon;
  const isCompleted = task.status === 'COMPLETED';

  let daysLeft: number | null = null;
  if (showDaysLeft && task.dueDate) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setUTCHours(0, 0, 0, 0);
    daysLeft = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <Card
      className={cn(
        'py-0 transition-opacity duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
        isCompleted && 'opacity-50',
      )}
    >
      <CardContent className="py-3">
        {daysLeft !== null && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
            {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
          </p>
        )}
        <div className="flex items-start gap-3">
        <div className="pt-0.5 shrink-0">
          <TooltipProvider delay={300}>
            <Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    current.triggerClass,
                  )}
                  aria-label={`Status: ${current.label}. Click to change.`}
                >
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <CurrentIcon className="size-4" />
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-36">
                  {STATUS_ORDER.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => onStatusChange(task.id, s)}
                        className={cn(s === task.status && 'font-medium')}
                      >
                        <Icon className={cn('mr-2 size-4', STATUS_CONFIG[s].triggerClass)} />
                        {cfg.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>{current.label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'font-medium text-sm leading-snug cursor-pointer hover:underline',
              isCompleted && 'line-through text-muted-foreground',
            )}
            onClick={() => onViewDetail(task)}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {task.description}
            </p>
          )}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {task.dueDate && (
              <Badge
                variant="outline"
                className={cn('text-xs', dueDateBadgeClass(task.dueDate, task.status === 'COMPLETED' ? task.statusChangedAt : null))}
              >
                {formatDueDate(task.dueDate, task.status === 'COMPLETED' ? task.statusChangedAt : null)}
              </Badge>
            )}
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Badge className={cn('text-xs border-0', importanceColor(task.importance))}>
                    {importanceLabel[task.importance]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{importanceFullLabel[task.importance]}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {task.statusChangedAt && task.status !== 'PENDING' && (
            <p className="text-xs text-muted-foreground mt-1">
              {current.label} · {formatStatusDate(task.statusChangedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {task.imageUrl && (
            <button
              type="button"
              onClick={() => onViewDetail(task)}
              className="mr-1"
              aria-label={`View image for "${task.title}"`}
            >
              <img
                src={task.imageUrl}
                alt=""
                className="size-8 rounded object-cover"
              />
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(task)}
            aria-label={`Edit "${task.title}"`}
            className="size-8"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task)}
            aria-label={`Delete "${task.title}"`}
            className="size-8"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
