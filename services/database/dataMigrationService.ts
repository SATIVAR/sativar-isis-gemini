import databaseService from './index';
import { settingsRepository } from './repositories/SettingsRepository';
import { remindersRepository } from './repositories/RemindersRepository';
import { quotesRepository } from './repositories/QuotesRepository';
import logger from '../../utils/logger';
import { ErrorHandler, AppError, ErrorCode } from '../../utils/errorHandler';
import { Settings, Reminder, QuoteResult, Task } from '../../types';

const SETTINGS_KEY = 'sativar_isis_settings';
const REMINDERS_KEY = 'sativar_isis_reminders';
const QUOTES_KEY = 'sativar_isis_quotes';

export class DataMigrationService {
  /**
   * Migrates all localStorage data to the database
   */
  async migrateLocalStorageData(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Starting localStorage to database migration...');
      
      // Check if we have localStorage data to migrate
      const hasSettings = localStorage.getItem(SETTINGS_KEY) !== null;
      const hasReminders = localStorage.getItem(REMINDERS_KEY) !== null;
      const hasQuotes = localStorage.getItem(QUOTES_KEY) !== null;
      
      if (!hasSettings && !hasReminders && !hasQuotes) {
        return { success: true, message: 'No localStorage data to migrate' };
      }
      
      // Migrate settings
      if (hasSettings) {
        await this.migrateSettings();
      }
      
      // Migrate reminders
      if (hasReminders) {
        await this.migrateReminders();
      }
      
      // Migrate quotes
      if (hasQuotes) {
        await this.migrateQuotes();
      }
      
      logger.info('LocalStorage to database migration completed successfully');
      
      return { success: true, message: 'Data migration completed successfully' };
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to migrate localStorage data to database');
      logger.error(appError.message, { details: appError.details });
      return { success: false, message: appError.message };
    }
  }
  
  /**
   * Migrates settings from localStorage to database
   */
  private async migrateSettings(): Promise<void> {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const settings: Settings = JSON.parse(storedSettings);
        await settingsRepository.updateSettings(settings);
        logger.info('Settings migrated successfully');
      }
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to migrate settings');
    }
  }
  
  /**
   * Migrates reminders from localStorage to database
   */
  private async migrateReminders(): Promise<void> {
    try {
      const storedReminders = localStorage.getItem(REMINDERS_KEY);
      if (storedReminders) {
        const reminders: Reminder[] = JSON.parse(storedReminders);
        for (const reminder of reminders) {
          // We need to adapt the structure a bit for the repository
          const reminderToCreate = {
            title: reminder.title,
            dueDate: reminder.dueDate,
            dueTime: reminder.dueTime,
            isCompleted: reminder.isCompleted,
            quoteId: reminder.quoteId,
            patientName: reminder.patientName,
            recurrence: reminder.recurrence,
            endDate: reminder.endDate,
            parentId: reminder.parentId,
            tasks: reminder.tasks.map(task => ({
              text: task.text,
              isCompleted: task.isCompleted
            })) as unknown as Task[]
          };
          
          await remindersRepository.createReminder(reminderToCreate);
        }
        logger.info(`Migrated ${reminders.length} reminders successfully`);
      }
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to migrate reminders');
    }
  }
  
  /**
   * Migrates quotes from localStorage to database
   */
  private async migrateQuotes(): Promise<void> {
    try {
      const storedQuotes = localStorage.getItem(QUOTES_KEY);
      if (storedQuotes) {
        const quotes: QuoteResult[] = JSON.parse(storedQuotes);
        for (const quote of quotes) {
          // We need to adapt the structure a bit for the repository
          const quoteToCreate = {
            patientName: quote.patientName,
            internalSummary: quote.internalSummary,
            patientMessage: quote.patientMessage,
            medicalHistory: quote.medicalHistory,
            doctorNotes: quote.doctorNotes,
            observations: quote.observations,
            validity: quote.validity,
            products: quote.products.map(product => ({
              name: product.name,
              quantity: product.quantity,
              concentration: product.concentration,
              status: product.status
            })),
            totalValue: quote.totalValue
          };
          
          await quotesRepository.createQuote(quoteToCreate);
        }
        logger.info(`Migrated ${quotes.length} quotes successfully`);
      }
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to migrate quotes');
    }
  }
  
  /**
   * Clears localStorage data after successful migration
   */
  async clearLocalStorageAfterMigration(): Promise<void> {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(REMINDERS_KEY);
      localStorage.removeItem(QUOTES_KEY);
      logger.info('LocalStorage data cleared after migration');
    } catch (error) {
      logger.warn('Failed to clear localStorage after migration', error);
    }
  }
}

export const dataMigrationService = new DataMigrationService();