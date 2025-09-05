import { fallbackManager } from './fallbackManager';
import databaseService from './index';
import { settingsRepository } from './repositories/SettingsRepository';
import { remindersRepository } from './repositories/RemindersRepository';
import { quotesRepository } from './repositories/QuotesRepository';
import logger from '../../utils/logger';
import { AppError, ErrorCode } from '../../utils/errorHandler';
import { apiClient as databaseClient } from './apiClient';
import { toastService } from '../toastService';

export class SyncService {
  private static instance: SyncService;
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Synchronize localStorage changes with the database when reconnected
   */
  async syncWithDatabase(): Promise<{ success: boolean; message: string; conflicts?: any[] }> {
    if (this.isSyncing) {
      toastService.info("Sincronização já está em andamento. Por favor, aguarde.");
      return { success: false, message: 'Synchronization already in progress' };
    }

    if (!databaseService.isConnected()) {
      toastService.error("Banco de dados não está conectado. Verifique a conexão e tente novamente.");
      return { success: false, message: 'Database is not connected' };
    }

    if (!fallbackManager.isInFallbackMode()) {
      toastService.info("Não há dados pendentes para sincronização.");
      return { success: false, message: 'Not in fallback mode' };
    }

    this.isSyncing = true;
    toastService.info("Iniciando sincronização com o banco de dados...");
    logger.info('Starting synchronization with database...');

    try {
      // Dequeue ready operations from fallback manager
      const queuedOperations = fallbackManager.dequeueReadyOperations(200);
      logger.info(`Found ${queuedOperations.length} operations ready to sync`);
      
      if (queuedOperations.length > 0) {
        toastService.info(`Encontradas ${queuedOperations.length} operações para sincronizar.`);
      }

      const conflicts: any[] = [];
      let syncedCount = 0;

      // Process each queued operation
      const completedIds: string[] = [];
      for (const { id, operation, data } of queuedOperations) {
        try {
          await this.processOperation(operation, data, conflicts);
          completedIds.push(id);
          syncedCount++;
        } catch (error) {
          logger.error(`Failed to sync operation: ${operation}`, error);
          conflicts.push({
            operation,
            data,
            error: error instanceof AppError ? error : new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Sync failed', undefined, error)
          });
          fallbackManager.markOperationFailed(id, error);
        }
      }

      // Remove successful operations
      fallbackManager.completeOperations(completedIds);

      // After push, perform bidirectional pull to update local state if needed
      await this.pullRemoteChanges();

      // Disable fallback mode after successful sync
      await fallbackManager.disableFallbackMode();

      const message = `Synchronization completed. ${syncedCount} operations synced.`;
      logger.info(message);
      
      if (syncedCount > 0) {
        toastService.success(`Sincronização concluída com sucesso! ${syncedCount} operações sincronizadas.`);
      }

      return {
        success: true,
        message,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Synchronization failed', undefined, error);
      
      logger.error('Synchronization failed', appError);
      toastService.error("Falha na sincronização. Por favor, tente novamente.");
      return {
        success: false,
        message: appError.message,
        conflicts: []
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single operation during synchronization
   */
  private async processOperation(operation: string, data: any, conflicts: any[]): Promise<void> {
    logger.info(`Processing operation: ${operation}`, data);

    switch (operation) {
      case 'settings.update':
        await this.syncSettings(data);
        break;
        
      case 'reminder.create':
        await this.syncReminderCreate(data);
        break;
        
      case 'reminder.update':
        await this.syncReminderUpdate(data);
        break;
        
      case 'reminder.delete':
        await this.syncReminderDelete(data);
        break;
        
      case 'quote.create':
        await this.syncQuoteCreate(data);
        break;
        
      case 'quote.delete':
        await this.syncQuoteDelete(data);
        break;
        
      default:
        logger.warn(`Unknown operation type: ${operation}`);
        conflicts.push({
          operation,
          data,
          error: new AppError(ErrorCode.DATA_VALIDATION_FAILED, `Unknown operation type: ${operation}`)
        });
    }
  }

  /**
   * Synchronize settings update
   */
  private async syncSettings(data: any): Promise<void> {
    try {
      await settingsRepository.updateSettings(data);
      logger.info('Settings synchronized successfully');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to sync settings', undefined, error);
    }
  }

  /**
   * Synchronize reminder creation
   */
  private async syncReminderCreate(data: any): Promise<void> {
    try {
      await remindersRepository.createReminder(data);
      logger.info('Reminder created successfully during sync');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to create reminder during sync', undefined, error);
    }
  }

  /**
   * Synchronize reminder update
   */
  private async syncReminderUpdate(data: any): Promise<void> {
    try {
      // Try optimistic concurrency if version provided
      if (typeof data.version === 'number') {
        const result = await remindersRepository.updateReminderWithVersion(data, data.version);
        if (!result.updated) {
          // Conflict: fetch remote and merge
          const remote = await remindersRepository.getReminderRaw(data.id);
          const merged = this.mergeReminderConflict(data, remote);
          // Try again with current remote version
          const retry = await remindersRepository.updateReminderWithVersion(merged, remote?.version ?? data.version);
          if (!retry.updated) {
            throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Conflict could not be resolved');
          }
        }
      } else {
        await remindersRepository.updateReminder(data);
      }
      logger.info('Reminder updated successfully during sync');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to update reminder during sync', undefined, error);
    }
  }

  /**
   * Synchronize reminder deletion
   */
  private async syncReminderDelete(data: any): Promise<void> {
    try {
      const success = await remindersRepository.deleteReminder(data.id);
      if (!success) {
        throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to delete reminder during sync');
      }
      logger.info('Reminder deleted successfully during sync');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to delete reminder during sync', undefined, error);
    }
  }

  /**
   * Synchronize quote creation
   */
  private async syncQuoteCreate(data: any): Promise<void> {
    try {
      await quotesRepository.createQuote(data);
      logger.info('Quote created successfully during sync');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to create quote during sync', undefined, error);
    }
  }

  /**
   * Synchronize quote deletion
   */
  private async syncQuoteDelete(data: any): Promise<void> {
    try {
      const success = await quotesRepository.deleteQuote(data.id);
      if (!success) {
        throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to delete quote during sync');
      }
      logger.info('Quote deleted successfully during sync');
    } catch (error) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'Failed to delete quote during sync', undefined, error);
    }
  }

  /**
   * Detect conflicts between localStorage and database data
   */
  async detectConflicts(): Promise<any[]> {
    try {
      // Get all reminders from localStorage
      const localStorageReminders = fallbackManager.getStoredReminders();
      
      // Get all reminders from database
      const dbReminders = await remindersRepository.getAllReminders();
      
      const conflicts: any[] = [];
      
      // Compare reminders by ID and version
      for (const localReminder of localStorageReminders) {
        const dbReminder = dbReminders.find(r => r.id === localReminder.id);
        
        // If reminder exists in both places and versions differ, it's a conflict
        // Note: We're checking for version property in both local and database reminders
        if (dbReminder && 
            typeof localReminder.version === 'number' && 
            typeof (dbReminder as any).version === 'number' &&
            localReminder.version !== (dbReminder as any).version) {
          conflicts.push({
            id: localReminder.id,
            local: localReminder,
            remote: dbReminder,
            type: 'reminder_version_conflict'
          });
        }
      }
      
      logger.info(`Conflict detection completed. Found ${conflicts.length} conflicts.`);
      
      if (conflicts.length > 0) {
        toastService.warning(`Foram detectados ${conflicts.length} conflitos de sincronização. Por favor, resolva-os.`);
      } else {
        toastService.success("Nenhum conflito de sincronização encontrado.");
      }
      
      return conflicts;
    } catch (error) {
      logger.error('Error detecting conflicts', error);
      toastService.error("Erro ao detectar conflitos de sincronização. Por favor, tente novamente.");
      return [];
    }
  }

  private mergeReminderConflict(local: any, remote: any): any {
    if (!remote) return local;
    
    // Compare timestamps to determine which version is newer
    const localUpdatedAt = new Date(local.updated_at || local.updatedAt || 0);
    const remoteUpdatedAt = new Date(remote.updated_at || 0);
    
    // If local version is newer or timestamps are equal, prefer local changes
    if (localUpdatedAt > remoteUpdatedAt) {
      return {
        ...remote,
        ...local,
        version: ((remote as any).version || 0) + 1
      };
    } else {
      // If remote version is newer, prefer remote but merge local changes
      return {
        ...remote,
        title: local.title !== undefined ? local.title : remote.title,
        dueDate: local.dueDate !== undefined ? local.dueDate : remote.due_date,
        dueTime: local.dueTime !== undefined ? local.dueTime : remote.due_time,
        isCompleted: local.isCompleted !== undefined ? local.isCompleted : remote.is_completed,
        quoteId: local.quoteId !== undefined ? local.quoteId : remote.quote_id,
        patientName: local.patientName !== undefined ? local.patientName : remote.patient_name,
        recurrence: local.recurrence !== undefined ? local.recurrence : remote.recurrence,
        endDate: local.endDate !== undefined ? local.endDate : remote.end_date,
        parentId: local.parentId !== undefined ? local.parentId : remote.parent_id,
        tasks: local.tasks !== undefined ? local.tasks : remote.tasks,
        version: ((remote as any).version || 0) + 1
      };
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    try {
      // Get the last sync timestamp from localStorage
      const lastSync = fallbackManager.getLastSyncTimestamp();
      
      if (lastSync) {
        // Fetch reminders updated since last sync
        const result = await databaseClient.query(
          `SELECT * FROM reminders WHERE updated_at > $1 ORDER BY updated_at`,
          [new Date(lastSync).toISOString()]
        );
        
        // Update localStorage with remote changes
        for (const row of result.rows) {
          fallbackManager.updateStoredReminder(row);
        }
        
        logger.info(`Pulled ${result.rows.length} remote changes`);
      }
      
      // Update last sync timestamp
      fallbackManager.updateLastSyncTimestamp();
    } catch (e) {
      logger.warn('Pull remote changes failed', e);
    }
  }
}

export const syncService = SyncService.getInstance();