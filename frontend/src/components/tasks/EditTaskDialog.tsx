import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/types';
import { taskFormSchema, type TaskFormData } from '@/lib/taskSchemas';
import { useUpdateTask, useUploadTaskImage, useDeleteTaskImage } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const updateTask = useUpdateTask();
  const uploadImage = useUploadTaskImage();
  const deleteImage = useDeleteTaskImage();

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      importance: task.importance,
    },
  });

  useEffect(() => {
    form.reset({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      importance: task.importance,
    });
    setNewImageFile(null);
    setRemoveImage(false);
  }, [task, form]);

  async function onSubmit(data: TaskFormData) {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          importance: data.importance,
        },
      });

      if (newImageFile) {
        await uploadImage.mutateAsync({ id: task.id, file: newImageFile });
      } else if (removeImage && task.imageUrl) {
        await deleteImage.mutateAsync(task.id);
      }

      onOpenChange(false);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? 'Failed to update task')
        : 'Failed to update task';
      toast.error(message);
    }
  }

  const isPending = updateTask.isPending || uploadImage.isPending || deleteImage.isPending;
  const showCurrentImage = !!task.imageUrl && !removeImage && !newImageFile;
  const showRemoveNotice = !!task.imageUrl && removeImage && !newImageFile;
  const showFilePicker = !task.imageUrl || removeImage || !!newImageFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="importance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importance</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showCurrentImage && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Image</p>
                <img
                  src={task.imageUrl!}
                  alt=""
                  className="rounded-md max-h-32 object-contain bg-muted w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRemoveImage(true)}
                >
                  Remove image
                </Button>
              </div>
            )}

            {showRemoveNotice && (
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">Image will be removed on save.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRemoveImage(false)}
                >
                  Keep image
                </Button>
              </div>
            )}

            {showFilePicker && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {task.imageUrl ? 'Replace image' : 'Add image (optional)'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    setNewImageFile(e.target.files?.[0] ?? null);
                    setRemoveImage(false);
                  }}
                  className="w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                />
                {newImageFile && (
                  <p className="text-xs text-muted-foreground">{newImageFile.name}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
