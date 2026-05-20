export interface User {
  id: string;
  username: string;
  passwordChangeRequired?: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  passwordChangeRequired: boolean;
  createdAt: string;
}

export type BackupSchedule = 'disabled' | 'daily' | 'weekly';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export interface AutoBackupConfig {
  schedule: BackupSchedule;
  hour: number;
}

export interface BackupsResponse {
  backups: BackupInfo[];
  autoBackup: AutoBackupConfig;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  actorId: string;
  actorUsername: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  nextCursor: string | null;
}

export interface TelegramStatus {
  enabled: boolean;
  linked: boolean;
  linkCode: string | null;
}

export type Importance = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TaskSparklines {
  total: number[];
  created: number[];
  open: number[];
  completed: number[];
  completedTotal: number[];
  onTime: number[];
  late: number[];
  overdue: number[];
  completionRate: number[];
  byStatus: { PENDING: number[]; STARTED: number[]; WAITING: number[]; COMPLETED: number[] };
  byImportance: { HIGH: number[]; MEDIUM: number[]; LOW: number[] };
}

export interface TaskTimelineEntry {
  month: string;
  created: number;
  completed: number;
  onTime: number;
  late: number;
  avgDays: number | null;
}

export interface TaskStats {
  total: number;
  open: number;
  completed: number;
  completionRate: number;
  completedOnTime: number;
  completedLate: number;
  overdue: number;
  byStatus: { PENDING: number; STARTED: number; WAITING: number; COMPLETED: number };
  byImportance: { HIGH: number; MEDIUM: number; LOW: number };
}

export type TaskStatus = 'PENDING' | 'STARTED' | 'WAITING' | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  importance: Importance;
  status: TaskStatus;
  statusChangedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
