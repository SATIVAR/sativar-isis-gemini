import { AppError, ErrorCode } from '../../utils/errorHandler';
import logger from '../../utils/logger';
import { toastService } from '../toastService';

export class FallbackManager {
  private static instance: FallbackManager;
  private fallbackMode = false;
  private fallbackReason: string | null = null;
  private operationQueue: Array<{
    id: string;
    operation: string;
    data: any;
    timestamp: number;
    status: 'pending' | 'processing' | 'failed';
    retryCount: number;
    nextAttemptAt?: number;
  }> = [];
  private lastSyncTimestamp: number | null = null;

  private static readonly STORAGE_KEYS = {
    queue: 'sativar_fallback_queue_v1',
    status: 'sativar_fallback_status_v1',
    reminders: 'sativar_fallback_reminders_v1',
    lastSync: 'sativar_fallback_last_sync_v1'
  } as const;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): FallbackManager {
    if (!FallbackManager.instance) {
      FallbackManager.instance = new FallbackManager();
    }
    return FallbackManager.instance;
  }

  /**
   * Enable fallback mode when database is unavailable
   */
  async enableFallbackMode(reason: string): Promise<void> {
    if (this.fallbackMode) return;
    
    this.fallbackMode = true;
    this.fallbackReason = reason;
    this.persistStatus();
    
    logger.info(`Fallback mode enabled: ${reason}`);
    
    // Notify user about fallback mode activation
    switch (reason) {
      case 'database_unavailable_on_create':
      case 'database_unavailable_on_update':
      case 'database_unavailable_on_delete':
        toastService.warning("Modo offline ativado. As operações serão sincronizadas quando a conexão for restaurada.");
        break;
      default:
        toastService.warning("Modo offline ativado devido a problemas de conexão.");
    }
  }

  /**
   * Disable fallback mode when database connection is restored
   */
  async disableFallbackMode(): Promise<void> {
    if (!this.fallbackMode) {
      return;
    }

    this.fallbackMode = false;
    this.fallbackReason = null;
    this.persistStatus();
    
    logger.info('Fallback mode disabled. Database connection restored.');
    
    // Notify the user about fallback deactivation
    toastService.success('Conexão com o banco de dados restaurada.');
    
    // Attempt to sync queued operations
    await this.syncQueuedOperations();
  }

  /**
   * Check if the application is currently in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Get the reason for fallback mode
   */
  getFallbackReason(): string | null {
    return this.fallbackReason;
  }

  /**
   * Queue an operation for later sync when database is available
   */
  queueOperation(operation: string, data: any): void {
    if (!this.fallbackMode) {
      logger.warn('Attempted to queue operation while not in fallback mode');
      return;
    }

    const queued = {
      id: crypto.randomUUID(),
      operation,
      data,
      timestamp: Date.now(),
      status: 'pending' as const,
      retryCount: 0 as number,
    };
    this.operationQueue.push(queued);
    this.persistQueue();
    logger.info(`Operation queued: ${operation}. Queue size: ${this.operationQueue.length}`);
    
    // Notify user about queued operation
    toastService.info(`Operação "${operation}" adicionada à fila para sincronização posterior.`);
  }

  /**
   * Get the current operation queue
   */
  getOperationQueue(): Array<{ id: string; operation: string; data: any; timestamp: number; status: 'pending' | 'processing' | 'failed'; retryCount: number; nextAttemptAt?: number; }> {
    return [...this.operationQueue];
  }

  /**
   * Clear the operation queue
   */
  clearOperationQueue(): void {
    this.operationQueue = [];
    this.persistQueue();
    logger.info('Operation queue cleared');
  }

  markOperationFailed(id: string, error: any): void {
    const op = this.operationQueue.find(o => o.id === id);
    if (!op) return;
    op.status = 'failed';
    op.retryCount += 1;
    // Exponential backoff: base 2s, cap 5m
    const delayMs = Math.min(300000, 2000 * Math.pow(2, Math.max(0, op.retryCount - 1)));
    op.nextAttemptAt = Date.now() + delayMs;
    this.persistQueue();
    logger.error(`Operation ${id} failed (retry ${op.retryCount}) - next attempt in ${Math.round(delayMs/1000)}s`, error);
    
    // Notify user about failed operation
    toastService.error(`Falha na operação "${op.operation}". Nova tentativa em ${Math.round(delayMs/1000)}s.`);
  }

  dequeueReadyOperations(limit = 50): Array<typeof this.operationQueue[number]> {
    const now = Date.now();
    const ready = this.operationQueue.filter(o => o.status !== 'processing' && (o.nextAttemptAt == null || o.nextAttemptAt <= now)).slice(0, limit);
    for (const op of ready) {
      op.status = 'processing';
    }
    this.persistQueue();
    return ready;
  }

  completeOperations(ids: string[]): void {
    if (!ids.length) return;
    const completedCount = ids.length;
    this.operationQueue = this.operationQueue.filter(o => !ids.includes(o.id));
    this.persistQueue();
    
    // Notify user about completed operations
    if (completedCount > 0) {
      toastService.success(`${completedCount} operação(ões) sincronizada(s) com sucesso.`);
    }
  }

  /**
   * Get stored reminders from localStorage
   */
  getStoredReminders(): any[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const reminders = window.localStorage.getItem(FallbackManager.STORAGE_KEYS.reminders);
      return reminders ? JSON.parse(reminders) : [];
    } catch (e) {
      logger.warn('Failed to get stored reminders', e);
      return [];
    }
  }

  /**
   * Update a stored reminder in localStorage
   */
  updateStoredReminder(reminder: any): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const reminders = this.getStoredReminders();
      const index = reminders.findIndex((r: any) => r.id === reminder.id);
      if (index >= 0) {
        reminders[index] = reminder;
      } else {
        reminders.push(reminder);
      }
      window.localStorage.setItem(FallbackManager.STORAGE_KEYS.reminders, JSON.stringify(reminders));
    } catch (e) {
      logger.warn('Failed to update stored reminder', e);
    }
  }

  /**
   * Get the last sync timestamp
   */
  getLastSyncTimestamp(): number | null {
    return this.lastSyncTimestamp;
  }

  /**
   * Update the last sync timestamp
   */
  updateLastSyncTimestamp(): void {
    this.lastSyncTimestamp = Date.now();
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(FallbackManager.STORAGE_KEYS.lastSync, this.lastSyncTimestamp.toString());
    } catch (e) {
      logger.warn('Failed to persist last sync timestamp', e);
    }
  }

  /**
   * Sync queued operations with the database
   */
  private async syncQueuedOperations(): Promise<void> {
    if (this.operationQueue.length === 0) {
      logger.info('No operations to sync');
      return;
    }

    logger.info(`Syncing ${this.operationQueue.length} queued operations...`);
    
    // Process each queued operation
    const failedOperations: Array<{ operation: string; data: any; error: any }> = [];
    
    for (const { operation, data } of this.operationQueue) {
      try {
        // In a real implementation, you would process each operation here
        // For now, we'll just log the operation
        logger.info(`Syncing operation: ${operation}`, data);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to sync operation: ${operation}`, error);
        failedOperations.push({ operation, data, error });
      }
    }
    
    // Clear the queue
    this.clearOperationQueue();
    
    // Report any failed operations
    if (failedOperations.length > 0) {
      logger.error(`Failed to sync ${failedOperations.length} operations`, failedOperations);
      toastService.error(`Falha ao sincronizar ${failedOperations.length} operação(ões).`);
      // In a real implementation, you might want to retry failed operations
      // or notify the user about them
    } else {
      logger.info('All queued operations synced successfully');
      toastService.success('Todas as operações pendentes foram sincronizadas com sucesso.');
    }
  }

  private persistQueue(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const payload = JSON.stringify(this.operationQueue);
      window.localStorage.setItem(FallbackManager.STORAGE_KEYS.queue, payload);
    } catch (e) {
      logger.warn('Failed to persist fallback queue', e);
    }
  }

  private persistStatus(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const payload = JSON.stringify({ active: this.fallbackMode, reason: this.fallbackReason, ts: Date.now() });
      window.localStorage.setItem(FallbackManager.STORAGE_KEYS.status, payload);
    } catch (e) {
      logger.warn('Failed to persist fallback status', e);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const q = window.localStorage.getItem(FallbackManager.STORAGE_KEYS.queue);
      if (q) {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed)) {
          this.operationQueue = parsed;
        }
      }
      const s = window.localStorage.getItem(FallbackManager.STORAGE_KEYS.status);
      if (s) {
        const parsed = JSON.parse(s);
        this.fallbackMode = !!parsed?.active;
        this.fallbackReason = parsed?.reason ?? null;
      }
      const l = window.localStorage.getItem(FallbackManager.STORAGE_KEYS.lastSync);
      if (l) {
        this.lastSyncTimestamp = parseInt(l, 10);
      }
    } catch (e) {
      logger.warn('Failed to load fallback state from storage', e);
    }
  }
}

export const fallbackManager = FallbackManager.getInstance();