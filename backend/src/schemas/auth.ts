import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: passwordSchema,
  })
  .strip();

export const loginSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1),
  })
  .strip();
