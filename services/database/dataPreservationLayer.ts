import type { Reminder, Task } from '../../types';
import { integrityValidator } from './validators';
import { remindersRepository } from './repositories/RemindersRepository';
import databaseService from './index';
import { fallbackManager } from './fallbackManager';
import { syncService } from './syncService';
import logger from '../../utils/logger';
import type { ConnectionStatus } from './types';
import { toastService } from '../toastService';
import { connectionManager } from './connectionManager';

// Dynamically import backup service only when needed and available
let backupService: any = null;
const getBackupService = async () => {
  if (backupService === null && typeof window === 'undefined') {
    try {
      backupService = await import('./backupService');
    } catch (error) {
      logger.warn('Failed to import backup service', error);
      backupService = false; // Mark as unavailable
    }
  }
  return backupService;
};

/**
 * Data Preservation Layer (DPL)
 * Central orchestrator that coordinates validation, DB/local fallback, and synchronization.
 */
class DataPreservationLayer {
  private static instance: DataPreservationLayer;

  private static readonly CACHE_KEYS = {
    reminders: 'sativar_cached_reminders_v1',
  } as const;

  private constructor() {}

  static getInstance(): DataPreservationLayer {
    if (!DataPreservationLayer.instance) {
      DataPreservationLayer.instance = new DataPreservationLayer();
    }
    return DataPreservationLayer.instance;
  }

  // Reminder operations
  async createReminder(reminderInput: Omit<Reminder, 'id'>): Promise<Reminder> {
    const reminderForValidation = this.toModelForValidation({ ...reminderInput, id: crypto.randomUUID() });
    const validation = integrityValidator.validateReminder(reminderForValidation);
    if (!validation.isValid) {
      const message = `Validation failed: ${validation.errors.map(e => e.code).join(', ')}`;
      toastService.error("Falha na validação do lembrete. Verifique os dados e tente novamente.");
      throw new Error(message);
    }

    if (this.canUseDatabase()) {
      try {
        const created = await remindersRepository.createReminder(reminderInput as any);
        this.cacheRemindersSafe(await this.safeFetchAllReminders());
        toastService.success("Lembrete criado com sucesso!");
        return created;
      } catch (err) {
        logger.warn('DB createReminder failed, enabling fallback and queueing operation', err);
        await fallbackManager.enableFallbackMode('database_unavailable_on_create');
        toastService.warning("Modo offline ativado. O lembrete será sincronizado quando a conexão for restaurada.");
      }
    }

    // Fallback path: queue operation and update local cache
    fallbackManager.queueOperation('reminder.create', reminderInput);
    const provisional: Reminder = { ...(reminderInput as any), id: reminderForValidation.id };
    this.updateCacheWithReminder(provisional);
    toastService.info("Lembrete salvo localmente. Será sincronizado quando a conexão for restaurada.");
    return provisional;
  }

  async updateReminder(reminder: Reminder & { version?: number }): Promise<Reminder> {
    const reminderForValidation = this.toModelForValidation(reminder);
    const validation = integrityValidator.validateReminder(reminderForValidation);
    if (!validation.isValid) {
      const message = `Validation failed: ${validation.errors.map(e => e.code).join(', ')}`;
      toastService.error("Falha na validação do lembrete. Verifique os dados e tente novamente.");
      throw new Error(message);
    }

    if (this.canUseDatabase()) {
      try {
        if (typeof (reminder as any).version === 'number') {
          const res = await remindersRepository.updateReminderWithVersion(reminder as any, (reminder as any).version);
          if (!res.updated) {
            logger.warn('Version conflict on updateReminder, queuing for sync');
            fallbackManager.queueOperation('reminder.update', reminder);
            toastService.warning("Conflito de versão detectado. O lembrete será sincronizado posteriormente.");
            return reminder;
          }
        } else {
          await remindersRepository.updateReminder(reminder);
        }
        this.cacheRemindersSafe(await this.safeFetchAllReminders());
        toastService.success("Lembrete atualizado com sucesso!");
        return reminder;
      } catch (err) {
        logger.warn('DB updateReminder failed, enabling fallback and queueing operation', err);
        await fallbackManager.enableFallbackMode('database_unavailable_on_update');
        toastService.warning("Modo offline ativado. O lembrete será sincronizado quando a conexão for restaurada.");
      }
    }

    fallbackManager.queueOperation('reminder.update', reminder);
    this.updateCacheWithReminder(reminder);
    toastService.info("Alterações salvas localmente. Serão sincronizadas quando a conexão for restaurada.");
    return reminder;
  }

  async deleteReminder(id: string): Promise<void> {
    if (this.canUseDatabase()) {
      try {
        await remindersRepository.deleteReminder(id);
        this.removeFromCache(id);
        toastService.success("Lembrete excluído com sucesso!");
        return;
      } catch (err) {
        logger.warn('DB deleteReminder failed, enabling fallback and queueing operation', err);
        await fallbackManager.enableFallbackMode('database_unavailable_on_delete');
        toastService.warning("Modo offline ativado. A exclusão será sincronizada quando a conexão for restaurada.");
      }
    }

    fallbackManager.queueOperation('reminder.delete', { id });
    this.removeFromCache(id);
    toastService.info("Exclusão agendada. Será sincronizada quando a conexão for restaurada.");
  }

  async getReminder(id: string): Promise<Reminder | null> {
    if (this.canUseDatabase()) {
      try {
        const all = await remindersRepository.getAllReminders();
        this.cacheRemindersSafe(all);
        return all.find(r => r.id === id) ?? null;
      } catch (err) {
        logger.warn('DB getReminder failed, falling back to cache', err);
        toastService.warning("Falha ao buscar lembrete do banco de dados. Usando dados locais.");
      }
    }
    const cache = this.getCachedReminders();
    return cache.find(r => r.id === id) ?? null;
  }

  async getAllReminders(): Promise<Reminder[]> {
    if (this.canUseDatabase()) {
      try {
        const all = await remindersRepository.getAllReminders();
        this.cacheRemindersSafe(all);
        return all;
      } catch (err) {
        logger.warn('DB getAllReminders failed, falling back to cache', err);
        toastService.warning("Falha ao buscar lembretes do banco de dados. Usando dados locais.");
      }
    }
    return this.getCachedReminders();
  }

  // System operations
  async sync(): Promise<{ success: boolean; message: string; conflicts?: any[] }> {
    const result = await syncService.syncWithDatabase();
    
    if (result.success) {
      toastService.success("Sincronização concluída com sucesso!");
    } else {
      toastService.error("Falha na sincronização. Por favor, tente novamente.");
    }
    
    if (result.conflicts && result.conflicts.length > 0) {
      toastService.warning(`Foram detectados ${result.conflicts.length} conflitos durante a sincronização.`);
    }
    
    return result;
  }

  getConnectionStatus(): ConnectionStatus {
    try {
      return databaseService.getConnectionStatus();
    } catch {
      return { status: 'disconnected' as any, timestamp: new Date() };
    }
  }

  async validateIntegrity() {
    return await integrityValidator.validateReferentialIntegrity();
  }

  // Backup operations
  async backupNow(): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const backupService = await getBackupService();
      if (backupService && backupService.createBackup) {
        const result = await backupService.createBackup();
        if (result.success) {
          toastService.success("Backup criado com sucesso!");
        } else {
          toastService.error("Falha ao criar backup.");
        }
        return result;
      } else {
        logger.warn('Backup functionality not available in browser environment');
        toastService.warning("Funcionalidade de backup não disponível no ambiente do navegador.");
        return { success: false, error: 'Backup functionality not available in browser environment' };
      }
    } catch (error) {
      logger.error('Backup operation failed', error);
      toastService.error("Erro ao realizar backup. Por favor, tente novamente.");
      return { success: false, error: 'Backup operation failed' };
    }
  }

  async verifyBackup(backupPath: string): Promise<{ valid: boolean; expected?: string; actual?: string }> {
    try {
      const backupService = await getBackupService();
      if (backupService && backupService.verifyBackup) {
        const result = await backupService.verifyBackup(backupPath);
        if (result.valid) {
          toastService.success("Backup verificado com sucesso!");
        } else {
          toastService.error("Falha na verificação do backup.");
        }
        return result;
      } else {
        logger.warn('Backup verification functionality not available in browser environment');
        toastService.warning("Funcionalidade de verificação de backup não disponível no ambiente do navegador.");
        return { valid: false };
      }
    } catch (error) {
      logger.error('Backup verification failed', error);
      toastService.error("Erro ao verificar backup. Por favor, tente novamente.");
      return { valid: false };
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      const backupService = await getBackupService();
      if (backupService && backupService.restoreBackup) {
        await backupService.restoreBackup(backupPath);
        toastService.success("Backup restaurado com sucesso!");
        return;
      } else {
        logger.warn('Backup restore functionality not available in browser environment');
        toastService.warning("Funcionalidade de restauração de backup não disponível no ambiente do navegador.");
        throw new Error('Backup restore functionality not available in browser environment');
      }
    } catch (error) {
      logger.error('Backup restore failed', error);
      toastService.error("Erro ao restaurar backup. Por favor, tente novamente.");
      throw error;
    }
  }

  // Helpers
  private canUseDatabase(): boolean {
    try {
      const status = connectionManager.getConnectionStatus();
      return status.connected && !status.fallbackMode;
    } catch {
      return false;
    }
  }

  private toModelForValidation(reminder: Reminder): {
    id: string; title: string; dueDate: Date; isCompleted: boolean; subtasks: Array<{ id: string; reminderId: string; title: string; isCompleted: boolean; createdAt: Date; updatedAt: Date; }>; createdAt: Date; updatedAt: Date; version: number;
  } {
    const now = new Date();
    return {
      id: reminder.id,
      title: reminder.title,
      dueDate: new Date(reminder.dueDate),
      isCompleted: !!reminder.isCompleted,
      subtasks: (reminder.tasks || []).map((t: Task) => ({
        id: t.id || crypto.randomUUID(),
        reminderId: reminder.id,
        title: t.text,
        isCompleted: !!t.isCompleted,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
      version: (reminder as any).version ?? 1,
    };
  }

  private getCachedReminders(): Reminder[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = window.localStorage.getItem(DataPreservationLayer.CACHE_KEYS.reminders);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      logger.warn('Failed to read cached reminders', e);
      return [];
    }
  }

  private cacheRemindersSafe(reminders: Reminder[]) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(DataPreservationLayer.CACHE_KEYS.reminders, JSON.stringify(reminders));
    } catch (e) {
      logger.warn('Failed to cache reminders', e);
    }
  }

  private async safeFetchAllReminders(): Promise<Reminder[]> {
    try {
      const all = await remindersRepository.getAllReminders();
      return all;
    } catch {
      return this.getCachedReminders();
    }
  }

  private updateCacheWithReminder(reminder: Reminder) {
    const current = this.getCachedReminders();
    const idx = current.findIndex(r => r.id === reminder.id);
    if (idx >= 0) current[idx] = reminder; else current.push(reminder);
    this.cacheRemindersSafe(current);
  }

  private removeFromCache(id: string) {
    const current = this.getCachedReminders().filter(r => r.id !== id);
    this.cacheRemindersSafe(current);
  }
}

export const dataPreservationLayer = DataPreservationLayer.getInstance();
export default dataPreservationLayer;