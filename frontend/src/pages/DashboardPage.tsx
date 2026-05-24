import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Task } from '@/types';
import { useTasks, useSetTaskStatus } from '@/hooks/useTasks';
import { sortTasks } from '@/lib/taskUtils';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/tasks/TaskList';
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { DeleteTaskConfirmDialog } from '@/components/tasks/DeleteTaskConfirmDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';

export default function DashboardPage() {
  const { data: tasks = [], isLoading, isError, refetch } = useTasks();
  const setTaskStatus = useSetTaskStatus();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Tasks · RoundTuit';
  }, []);

  const sorted = sortTasks(tasks);
  const incompleteCount = tasks.filter((t) => t.status !== 'COMPLETED').length;
  const detailTask = tasks.find((t) => t.id === detailTargetId) ?? null;

  return (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-semibold text-lg">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {incompleteCount === 0 ? 'All done!' : `${incompleteCount} remaining`}
        </p>
      </div>

      <TaskList
        tasks={sorted}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onStatusChange={(id, status) => setTaskStatus.mutate({ id, status })}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
        onViewDetail={(task) => setDetailTargetId(task.id)}
      />

      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setAddOpen(true)}
        aria-label="Add task"
      >
        <Plus className="size-5" />
      </Button>

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} />

      {editTarget && (
        <EditTaskDialog
          task={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        />
      )}

      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          open
          onClose={() => setDetailTargetId(null)}
        />
      )}

      {deleteTarget && (
        <DeleteTaskConfirmDialog
          task={deleteTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
