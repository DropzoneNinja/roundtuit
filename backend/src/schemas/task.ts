import { z } from 'zod';
import { Importance, TaskStatus } from '@prisma/client';

export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    importance: z.nativeEnum(Importance).default(Importance.MEDIUM),
  })
  .strip();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : val === null ? null : undefined)),
    importance: z.nativeEnum(Importance).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
  })
  .strip();
