import { api } from '@/lib/api';
import type { UserSummary, BackupsResponse, AutoBackupConfig, TelegramStatus } from '@/types';

export async function getUsers(): Promise<UserSummary[]> {
  const res = await api.get<UserSummary[]>('/api/settings/users');
  return res.data;
}

export async function resetPassword(userId: string): Promise<{ tempPassword: string; username: string }> {
  const res = await api.post('/api/settings/reset-password', { userId });
  return res.data as { tempPassword: string; username: string };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/settings/change-password', { currentPassword, newPassword });
}

export async function getBackups(): Promise<BackupsResponse> {
  const res = await api.get<BackupsResponse>('/api/settings/backups');
  return res.data;
}

export async function createBackup(): Promise<BackupsResponse & { filename: string }> {
  const res = await api.post('/api/settings/backups');
  return res.data as BackupsResponse & { filename: string };
}

export async function deleteBackup(filename: string): Promise<{ backups: BackupsResponse['backups'] }> {
  const res = await api.delete(`/api/settings/backups/${encodeURIComponent(filename)}`);
  return res.data as { backups: BackupsResponse['backups'] };
}

export function backupDownloadUrl(filename: string): string {
  const base = import.meta.env.VITE_API_URL ?? '';
  return `${base}/api/settings/backups/${encodeURIComponent(filename)}/download`;
}

export async function setAutoBackup(cfg: AutoBackupConfig): Promise<AutoBackupConfig> {
  const res = await api.put<AutoBackupConfig>('/api/settings/backups/auto', cfg);
  return res.data;
}

export async function restoreFromBackup(filename: string): Promise<void> {
  await api.post('/api/settings/restore/from-backup', { filename });
}

export async function restoreFromFile(file: File): Promise<void> {
  const text = await file.text();
  await api.post('/api/settings/restore/upload', text, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const res = await api.get<TelegramStatus>('/api/telegram/status');
  return res.data;
}

export async function unlinkTelegram(): Promise<void> {
  await api.post('/api/telegram/unlink');
}

export async function regenerateTelegramCode(): Promise<{ linkCode: string }> {
  const res = await api.post<{ linkCode: string }>('/api/telegram/regenerate-code');
  return res.data;
}
