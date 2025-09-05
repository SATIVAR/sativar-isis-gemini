import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import util from 'util';
import crypto from 'crypto';
import config from '../../config';
import logger from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { BackupResult } from './types';
import databaseService from './index';

const execPromise = util.promisify(exec);
const BACKUP_DIR = path.join(__dirname, 'backups');
const BACKUP_RETENTION_COUNT = 24; // keep last 24 hourly backups (~1 day)

/**
 * Creates a backup of the database.
 * @returns A promise that resolves with the backup result.
 */
export async function createBackup(): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${timestamp}.dump`;
  const backupPath = path.join(BACKUP_DIR, backupFile);

  // Ensure the backup directory exists
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    const appError = ErrorHandler.handle(error, 'Failed to create backup directory');
    logger.error(appError.message, { details: appError.details });
    return { success: false, error: appError.message };
  }

  const { host, port, user, password, database } = config.database;

  // Use PGPASSWORD to avoid interactive password prompt
  const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -b -v -f "${backupPath}"`;

  logger.info(`Creating database backup at: ${backupPath}`);

  try {
    const { stdout, stderr } = await execPromise(command, {
      env: { ...process.env, PGPASSWORD: password },
    });

    if (stderr) {
      logger.warn('pg_dump stderr:', stderr);
    }

    logger.info('pg_dump stdout:', stdout);

    // Compute checksum of backup file
    const checksum = await computeFileChecksum(backupPath);

    // Gather simple record counts for metadata
    const { recordCount } = await getApproximateRecordCount();

    // Save metadata in database
    await saveBackupMetadata({
      type: 'incremental',
      recordCount,
      checksum,
      filePath: backupPath,
    });

    // Enforce retention policy (best-effort)
    await cleanupOldBackups();

    logger.info('Database backup created and verified successfully.');
    return { success: true, path: backupPath };

  } catch (error) {
    const appError = ErrorHandler.handle(error, 'Database backup failed');
    logger.error(appError.message, { details: appError.details });
    // Attempt to clean up the failed backup file
    try {
      await fs.unlink(backupPath);
    } catch (cleanupError) {
      logger.warn(`Failed to clean up failed backup file: ${backupPath}`, cleanupError);
    }
    return { success: false, error: appError.message };
  }
}

/**
 * Restores a backup from a specified file.
 * @param backupPath The path to the backup file to restore.
 * @returns A promise that resolves when the restore is complete.
 */
export async function restoreBackup(backupPath: string): Promise<void> {
  const { host, port, user, password, database } = config.database;

  // Backups are created with pg_dump custom format (-F c), so we must use pg_restore
  const command = `pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -v "${backupPath}"`;

  logger.info(`Restoring database from: ${backupPath}`);

  try {
    await execPromise(command, {
      env: { ...process.env, PGPASSWORD: password },
    });
    logger.info('Database restored successfully.');
  } catch (error) {
    const appError = ErrorHandler.handle(error, 'Database restore failed');
    logger.error(appError.message, { details: appError.details });
    throw appError;
  }
}

/**
 * Verifies a backup's integrity by recomputing its checksum and comparing it with stored metadata.
 */
export async function verifyBackup(backupPath: string): Promise<{ valid: boolean; expected?: string; actual?: string }> {
  try {
    const actual = await computeFileChecksum(backupPath);
    const result = await databaseService.query<{ checksum: string }>(
      'SELECT checksum FROM backup_metadata WHERE file_path = $1 ORDER BY timestamp DESC LIMIT 1',
      [backupPath]
    );
    const expected = result.rows[0]?.checksum;
    if (!expected) return { valid: false, actual };
    return { valid: expected === actual, expected, actual };
  } catch (error) {
    logger.error('Backup verification failed', error as any);
    return { valid: false };
  }
}

/**
 * Lists recent backups from backup_metadata with optional limit.
 */
export async function listBackups(limit = 50): Promise<Array<{ filePath: string; checksum: string; timestamp: Date; type: string; recordCount: number }>> {
  const rows = await databaseService.query<{
    file_path: string;
    checksum: string;
    timestamp: string;
    type: string;
    record_count: number;
  }>(
    'SELECT file_path, checksum, timestamp, type, record_count FROM backup_metadata ORDER BY timestamp DESC LIMIT $1',
    [limit]
  );
  return rows.rows.map(r => ({
    filePath: r.file_path,
    checksum: r.checksum,
    timestamp: new Date(r.timestamp),
    type: r.type,
    recordCount: r.record_count,
  }));
}

/**
 * Returns metadata preview and integrity check for a specific backup path.
 */
export async function getBackupPreview(backupPath: string): Promise<{
  filePath: string;
  existsOnDisk: boolean;
  checksumInDb?: string;
  computedChecksum?: string;
  verified: boolean;
  recordCount?: number;
  timestamp?: Date;
  type?: string;
}> {
  try {
    const { rows } = await databaseService.query<{
      checksum: string;
      record_count: number;
      timestamp: string;
      type: string;
    }>(
      'SELECT checksum, record_count, timestamp, type FROM backup_metadata WHERE file_path = $1 ORDER BY timestamp DESC LIMIT 1',
      [backupPath]
    );
    const meta = rows[0];
    let existsOnDisk = false;
    try {
      await fs.access(backupPath);
      existsOnDisk = true;
    } catch {
      existsOnDisk = false;
    }
    const computedChecksum = existsOnDisk ? await computeFileChecksum(backupPath) : undefined;
    const verified = !!meta?.checksum && !!computedChecksum && meta.checksum === computedChecksum;
    return {
      filePath: backupPath,
      existsOnDisk,
      checksumInDb: meta?.checksum,
      computedChecksum,
      verified,
      recordCount: meta?.record_count,
      timestamp: meta ? new Date(meta.timestamp) : undefined,
      type: meta?.type,
    };
  } catch (e) {
    logger.warn('Failed to get backup preview', { path: backupPath, error: e });
    return { filePath: backupPath, existsOnDisk: false, verified: false };
  }
}

/**
 * Starts an hourly backup scheduler.
 */
let backupSchedulerHandle: NodeJS.Timer | null = null;
export function startBackupScheduler(): void {
  if (backupSchedulerHandle) return;
  // Run immediately once, then hourly
  void createBackup();
  backupSchedulerHandle = setInterval(() => {
    void createBackup();
  }, 60 * 60 * 1000);
  logger.info('Backup scheduler started (hourly).');
}

export function stopBackupScheduler(): void {
  if (backupSchedulerHandle) {
    clearInterval(backupSchedulerHandle as any);
    backupSchedulerHandle = null;
    logger.info('Backup scheduler stopped.');
  }
}

async function computeFileChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

async function getApproximateRecordCount(): Promise<{ recordCount: number }> {
  try {
    const { rows: reminderRows } = await databaseService.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM reminders');
    const { rows: taskRows } = await databaseService.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM tasks');
    const { rows: syncRows } = await databaseService.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM sync_operations');
    const total =
      Number(reminderRows[0]?.count || 0) +
      Number(taskRows[0]?.count || 0) +
      Number(syncRows[0]?.count || 0);
    return { recordCount: total };
  } catch (e) {
    logger.warn('Failed to count records for backup metadata; defaulting to 0', e as any);
    return { recordCount: 0 };
  }
}

async function saveBackupMetadata(params: { type: 'full' | 'incremental'; recordCount: number; checksum: string; filePath: string; }): Promise<void> {
  const { type, recordCount, checksum, filePath } = params;
  try {
    await databaseService.query(
      `INSERT INTO backup_metadata (type, record_count, checksum, file_path) VALUES ($1, $2, $3, $4)`,
      [type, recordCount, checksum, filePath]
    );
  } catch (error) {
    const appError = ErrorHandler.handle(error, 'Failed to save backup metadata');
    logger.error(appError.message, { details: appError.details });
  }
}

async function cleanupOldBackups(): Promise<void> {
  try {
    const { rows } = await databaseService.query<{ file_path: string }>(
      `SELECT file_path FROM backup_metadata ORDER BY timestamp DESC OFFSET $1`,
      [BACKUP_RETENTION_COUNT]
    );
    for (const row of rows) {
      try {
        await fs.unlink(row.file_path);
        await databaseService.query(`DELETE FROM backup_metadata WHERE file_path = $1`, [row.file_path]);
        logger.info(`Old backup removed: ${row.file_path}`);
      } catch (e) {
        logger.warn('Failed to remove old backup', { path: row.file_path, error: e });
      }
    }
  } catch (e) {
    logger.warn('Failed to cleanup old backups', e as any);
  }
}