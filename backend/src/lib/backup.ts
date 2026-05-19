import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from './logger';

const execAsync = promisify(exec);

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

function dbParams() {
  const url = new URL(config.DATABASE_URL);
  return {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: url.port || '5432',
    dbname: url.pathname.slice(1),
  };
}

function pgEnv(password: string) {
  return { ...process.env, PGPASSWORD: password };
}

export async function createBackup(): Promise<string> {
  await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${ts}.sql`;
  const filepath = path.join(config.BACKUP_DIR, filename);

  const { user, password, host, port, dbname } = dbParams();
  await execAsync(`pg_dump -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${filepath}"`, {
    env: pgEnv(password),
  });

  logger.info({ filename }, 'Backup created');
  return filename;
}

export async function listBackups(): Promise<BackupInfo[]> {
  await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });

  const files = await fs.promises.readdir(config.BACKUP_DIR);
  const infos = await Promise.all(
    files
      .filter((f) => /^backup-[\w-]+\.sql$/.test(f))
      .map(async (filename) => {
        const stat = await fs.promises.stat(path.join(config.BACKUP_DIR, filename));
        return { filename, size: stat.size, createdAt: stat.mtime.toISOString() };
      }),
  );

  return infos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function resolveBackupPath(filename: string): Promise<string> {
  if (!/^backup-[\w-]+\.sql$/.test(filename)) throw new Error('Invalid backup filename');
  const filepath = path.join(config.BACKUP_DIR, filename);
  await fs.promises.access(filepath);
  return filepath;
}

export async function deleteBackup(filename: string): Promise<void> {
  const filepath = await resolveBackupPath(filename);
  await fs.promises.unlink(filepath);
  logger.info({ filename }, 'Backup deleted');
}

export async function restoreFromPath(filepath: string): Promise<void> {
  const { user, password, host, port, dbname } = dbParams();
  const env = pgEnv(password);

  await execAsync(
    `psql -h ${host} -p ${port} -U ${user} -d ${dbname} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
    { env },
  );
  await execAsync(`psql -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${filepath}"`, { env });

  logger.info({ filepath }, 'Database restored');
}
