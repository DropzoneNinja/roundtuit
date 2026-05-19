import { toast } from 'sonner';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/types';
import { useDeleteTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface DeleteTaskConfirmDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTaskConfirmDialog({
  task,
  open,
  onOpenChange,
}: DeleteTaskConfirmDialogProps) {
  const deleteTask = useDeleteTask();

  async function handleDelete() {
    try {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? 'Failed to delete task')
        : 'Failed to delete task';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            &ldquo;{task.title}&rdquo; will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={deleteTask.isPending} />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending && <Loader2 className="size-4 animate-spin" />}
            {deleteTask.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
