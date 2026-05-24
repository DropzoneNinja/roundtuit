import { api } from '@/lib/api';
import type { Task, Importance, TaskStatus, TaskStats, TaskTimelineEntry, TaskSparklines } from '@/types';

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

export async function uploadTaskImage(id: string, file: File): Promise<Task> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post<Task>(`/api/tasks/${id}/image`, formData);
  return res.data;
}

export async function deleteTaskImage(id: string): Promise<Task> {
  const res = await api.delete<Task>(`/api/tasks/${id}/image`);
  return res.data;
}

export async function getTaskStats(): Promise<TaskStats> {
  const res = await api.get<TaskStats>('/api/tasks/stats');
  return res.data;
}

export async function getTaskSparklines(): Promise<TaskSparklines> {
  const res = await api.get<TaskSparklines>('/api/tasks/sparklines');
  return res.data;
}

export async function getTaskTimeline(): Promise<TaskTimelineEntry[]> {
  const res = await api.get<TaskTimelineEntry[]>('/api/tasks/timeline');
  return res.data;
}
