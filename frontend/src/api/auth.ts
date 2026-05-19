import { api } from '@/lib/api';
import type { User } from '@/types';

export async function login(data: { username: string; password: string }): Promise<User> {
  const res = await api.post<User>('/api/auth/login', data);
  return res.data;
}

export async function register(data: { username: string; password: string }): Promise<User> {
  const res = await api.post<User>('/api/auth/register', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/api/auth/me');
  return res.data;
}
