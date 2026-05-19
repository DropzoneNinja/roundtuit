import { z } from 'zod';

export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export type TaskFormData = z.infer<typeof taskFormSchema>;
