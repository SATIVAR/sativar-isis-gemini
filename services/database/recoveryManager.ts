import databaseService from './index';
import logger from '../../utils/logger';
import { ErrorHandler } from '../../utils/errorHandler';
import { DiagnosticsReport } from './types';
import { fallbackManager } from './fallbackManager';

// Dynamically import backup service functions only when needed
const getBackupServiceFunctions = async () => {
  if (typeof window !== 'undefined') {
    // In browser environment, return mock functions
    return {
      verifyBackup: async () => ({ valid: false }),
      restoreBackup: async () => {},
      listBackups: async () => [],
      getBackupPreview: async () => ({ filePath: '', existsOnDisk: false, verified: false })
    };
  }
  
  try {
    const backupService = await import('./backupService');
    return {
      verifyBackup: backupService.verifyBackup,
      restoreBackup: backupService.restoreBackup,
      listBackups: backupService.listBackups,
      getBackupPreview: backupService.getBackupPreview
    };
  } catch (error) {
    logger.warn('Failed to import backup service', error);
    // Return mock functions if import fails
    return {
      verifyBackup: async () => ({ valid: false }),
      restoreBackup: async () => {},
      listBackups: async () => [],
      getBackupPreview: async () => ({ filePath: '', existsOnDisk: false, verified: false })
    };
  }
};

export class RecoveryManager {
  private static instance: RecoveryManager;

  private constructor() {}

  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  async quickDiagnostics(): Promise<DiagnosticsReport> {
    const connectionStatus = databaseService.getConnectionStatus();
    const databaseConnected = databaseService.isConnected();

    const tables = await this.checkCoreTables();
    const fallbackQueue = fallbackManager.getOperationQueue();

    const backupFunctions = await getBackupServiceFunctions();
    const latest = await this.getLatestBackupPath();
    const backupVerification = latest ? await backupFunctions.verifyBackup(latest).catch(() => ({ valid: false })) : { valid: false } as any;

    const recommendations: string[] = [];
    if (!databaseConnected) recommendations.push('Database disconnected. Investigate network and credentials.');
    if (!tables.every(t => t.exists)) recommendations.push('Missing tables detected. Run migrations.');
    if (fallbackManager.isInFallbackMode()) recommendations.push('Fallback mode active. Run synchronization when DB available.');
    if (!backupVerification.valid) recommendations.push('Latest backup failed verification. Create a fresh backup.');

    const result = {
      timestamp: new Date(),
      databaseConnected,
      connectionStatus,
      slowQueryWarning: undefined,
      tables,
      fallbackModeActive: fallbackManager.isInFallbackMode(),
      fallbackReason: fallbackManager.getFallbackReason(),
      fallbackQueueSize: fallbackQueue.length,
      backup: {
        exists: !!latest,
        latestPath: latest || undefined,
        verified: backupVerification.valid,
        expectedChecksum: (backupVerification as any).expected,
        actualChecksum: (backupVerification as any).actual,
      },
      recommendations,
    } as DiagnosticsReport;
    return result;
  }

  async restoreFromLatestBackup(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const latest = await this.getLatestBackupPath();
      if (!latest) {
        return { success: false, message: 'No backups found to restore.' };
      }

      const backupFunctions = await getBackupServiceFunctions();
      const verification = await backupFunctions.verifyBackup(latest);
      if (!verification.valid) {
        logger.warn('Latest backup failed verification, proceeding with caution', verification);
      }

      await backupFunctions.restoreBackup(latest);
      return { success: true, message: 'Database restored from latest backup', details: { path: latest } };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to restore from latest backup');
      logger.error(appError.message, { details: appError.details });
      return { success: false, message: appError.message };
    }
  }

  async listAvailableBackups(limit = 100): Promise<any> {
    const backupFunctions = await getBackupServiceFunctions();
    return backupFunctions.listBackups(limit);
  }

  async previewBackup(backupPath: string): Promise<any> {
    const backupFunctions = await getBackupServiceFunctions();
    return backupFunctions.getBackupPreview(backupPath);
  }

  async restoreFromPath(backupPath: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const backupFunctions = await getBackupServiceFunctions();
      const verification = await backupFunctions.verifyBackup(backupPath);
      if (!verification.valid) {
        logger.warn('Selected backup failed verification, proceeding with caution', verification);
      }
      await backupFunctions.restoreBackup(backupPath);
      return { success: true, message: 'Database restored from selected backup', details: { path: backupPath } };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to restore from selected backup');
      logger.error(appError.message, { details: appError.details });
      return { success: false, message: appError.message };
    }
  }

  private emergencyMode = false;

  enableEmergencyMode(): void {
    if (this.emergencyMode) return;
    this.emergencyMode = true;
    logger.warn('Emergency recovery mode enabled. System is operating with reduced functionality.');
  }

  disableEmergencyMode(): void {
    if (!this.emergencyMode) return;
    this.emergencyMode = false;
    logger.info('Emergency recovery mode disabled.');
  }

  isEmergencyModeEnabled(): boolean {
    return this.emergencyMode;
  }

  async checkCoreTables(): Promise<Array<{ table: string; exists: boolean; rowCount?: number }>> {
    const coreTables = ['reminders', 'tasks', 'sync_operations', 'backup_metadata', 'notification_log'];
    const results: Array<{ table: string; exists: boolean; rowCount?: number }> = [];
    for (const table of coreTables) {
      try {
        const existsRes = await databaseService.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
          [table]
        );
        const exists = !!existsRes.rows[0]?.exists;
        let rowCount: number | undefined = undefined;
        if (exists) {
          const countRes = await databaseService.query(`SELECT COUNT(*)::text AS count FROM ${table}`);
          rowCount = Number(countRes.rows[0]?.count || 0);
        }
        results.push({ table, exists, rowCount });
      } catch (error) {
        logger.warn('Table health check failed', { table, error });
        results.push({ table, exists: false });
      }
    }
    return results;
  }

  private async getLatestBackupPath(): Promise<string | null> {
    try {
      const { rows } = await databaseService.query(
        `SELECT file_path FROM backup_metadata ORDER BY timestamp DESC LIMIT 1`
      );
      return rows[0]?.file_path ?? null;
    } catch (e) {
      logger.warn('Failed to fetch latest backup metadata', e as any);
      return null;
    }
  }
}

export const recoveryManager = RecoveryManager.getInstance();