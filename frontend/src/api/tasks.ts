import { api } from '@/lib/api';
import type { Task, Importance, TaskStatus } from '@/types';

export interface CreateTaskData {
  title: string;
  description?: string;
  dueDate?: string;
  importance?: Importance;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  importance?: Importance;
  status?: TaskStatus;
}

export async function getTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>('/api/tasks');
  return res.data;
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const res = await api.post<Task>('/api/tasks', data);
  return res.data;
}

export async function updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  const res = await api.put<Task>(`/api/tasks/${id}`, data);
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${id}`);
}
