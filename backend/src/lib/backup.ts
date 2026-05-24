import AdmZip from 'adm-zip';
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
  const zipFilename = `backup-${ts}.zip`;
  const zipPath = path.join(config.BACKUP_DIR, zipFilename);
  const tmpSql = path.join(config.BACKUP_DIR, `tmp-${ts}.sql`);

  const { user, password, host, port, dbname } = dbParams();
  await execAsync(`pg_dump -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${tmpSql}"`, {
    env: pgEnv(password),
  });

  const zip = new AdmZip();
  zip.addLocalFile(tmpSql, '', 'database.sql');

  try {
    const uploadFiles = await fs.promises.readdir(config.UPLOAD_DIR);
    for (const f of uploadFiles) {
      const fPath = path.join(config.UPLOAD_DIR, f);
      const stat = await fs.promises.stat(fPath);
      if (stat.isFile()) zip.addLocalFile(fPath, 'uploads/');
    }
    logger.info({ count: uploadFiles.length }, 'Added uploads to backup zip');
  } catch {
    logger.warn('Skipped uploads in backup zip — uploads directory may not exist yet');
  }

  zip.writeZip(zipPath);
  await fs.promises.unlink(tmpSql).catch(() => undefined);

  logger.info({ zipFilename }, 'Backup created');
  return zipFilename;
}

export async function listBackups(): Promise<BackupInfo[]> {
  await fs.promises.mkdir(config.BACKUP_DIR, { recursive: true });

  const files = await fs.promises.readdir(config.BACKUP_DIR);
  const infos = await Promise.all(
    files
      .filter((f) => /^backup-[\w-]+\.zip$/.test(f))
      .map(async (filename) => {
        const stat = await fs.promises.stat(path.join(config.BACKUP_DIR, filename));
        return { filename, size: stat.size, createdAt: stat.mtime.toISOString() };
      }),
  );

  return infos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function resolveBackupPath(filename: string): Promise<string> {
  if (!/^backup-[\w-]+\.zip$/.test(filename)) throw new Error('Invalid backup filename');
  const filepath = path.join(config.BACKUP_DIR, filename);
  await fs.promises.access(filepath);
  return filepath;
}

export async function deleteBackup(filename: string): Promise<void> {
  const filepath = await resolveBackupPath(filename);
  await fs.promises.unlink(filepath);
  logger.info({ filename }, 'Backup deleted');
}

export async function restoreFromPath(zipPath: string): Promise<void> {
  const zip = new AdmZip(zipPath);

  const sqlEntry = zip.getEntry('database.sql');
  if (!sqlEntry) throw new Error('Invalid backup: missing database.sql');

  const tmpSql = `${zipPath}.restore.sql`;
  await fs.promises.writeFile(tmpSql, sqlEntry.getData());

  const { user, password, host, port, dbname } = dbParams();
  const env = pgEnv(password);

  try {
    await execAsync(
      `psql -h ${host} -p ${port} -U ${user} -d ${dbname} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
      { env },
    );
    await execAsync(`psql -h ${host} -p ${port} -U ${user} -d ${dbname} -f "${tmpSql}"`, { env });
    logger.info({ zipPath }, 'Database restored from zip');

    const uploadEntries = zip
      .getEntries()
      .filter((e) => e.entryName.startsWith('uploads/') && !e.isDirectory);
    if (uploadEntries.length > 0) {
      await fs.promises.mkdir(config.UPLOAD_DIR, { recursive: true });
      for (const entry of uploadEntries) {
        const filename = path.basename(entry.entryName);
        if (filename) {
          await fs.promises.writeFile(path.join(config.UPLOAD_DIR, filename), entry.getData());
        }
      }
      logger.info({ count: uploadEntries.length }, 'Uploads restored from zip');
    }
  } finally {
    await fs.promises.unlink(tmpSql).catch(() => undefined);
  }
}
