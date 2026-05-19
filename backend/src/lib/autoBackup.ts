import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { createBackup, listBackups } from './backup';
import logger from './logger';

const CONFIG_FILE = path.join(config.BACKUP_DIR, '.autobackup.json');

export type BackupSchedule = 'disabled' | 'daily' | 'weekly';

export interface AutoBackupConfig {
  schedule: BackupSchedule;
  hour: number;
}

const DEFAULT_CONFIG: AutoBackupConfig = { schedule: 'disabled', hour: 2 };

let checkTimer: NodeJS.Timeout | null = null;

export async function getAutoBackupConfig(): Promise<AutoBackupConfig> {
  try {
    await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });
    const raw = await fs.promises.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as AutoBackupConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function setAutoBackupConfig(cfg: AutoBackupConfig): Promise<void> {
  await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });
  await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  scheduleChecks();
}

async function shouldRunNow(cfg: AutoBackupConfig): Promise<boolean> {
  if (cfg.schedule === 'disabled') return false;

  const now = new Date();
  if (now.getHours() !== cfg.hour) return false;

  const backups = await listBackups();
  if (backups.length === 0) return true;

  const msSinceLast = now.getTime() - new Date(backups[0].createdAt).getTime();
  const minInterval = cfg.schedule === 'daily' ? 20 * 3600_000 : 6 * 24 * 3600_000;
  return msSinceLast >= minInterval;
}

async function runCheck(): Promise<void> {
  try {
    const cfg = await getAutoBackupConfig();
    if (await shouldRunNow(cfg)) {
      await createBackup();
    }
  } catch (err) {
    logger.error({ err }, 'Auto-backup check failed');
  }
}

function scheduleChecks(): void {
  if (checkTimer) clearInterval(checkTimer);
  // Check every hour; the check itself decides whether to run based on schedule
  checkTimer = setInterval(() => void runCheck(), 60 * 60_000);
}

export async function initAutoBackup(): Promise<void> {
  scheduleChecks();
  // Run an immediate check in case the server was down during scheduled time
  await runCheck();
}

// Temp file path for uploaded restore files
export function tempRestorePath(): string {
  return path.join(config.BACKUP_DIR, `restore-tmp-${Date.now()}.sql`);
}
