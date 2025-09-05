import { apiClient as databaseClient } from './apiClient';
import type { Settings, Reminder, Task } from '../../types';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

class DataMigrationService {
  private readonly SETTINGS_KEY = 'sativar_isis_settings';
  private readonly REMINDERS_KEY = 'sativar_isis_reminders';
  private readonly ADMIN_KEY = 'sativar_isis_admin_credentials';

  async migrateLocalStorageData(): Promise<MigrationResult> {
    try {
      console.log('Starting localStorage to PostgreSQL data migration...');
      
      const results = {
        settings: await this.migrateSettings(),
        reminders: await this.migrateReminders(),
        adminUsers: await this.migrateAdminUsers()
      };

      const allSuccessful = Object.values(results).every(r => r.success);
      
      if (allSuccessful) {
        console.log('Data migration completed successfully');
        return {
          success: true,
          message: 'All data migrated successfully',
          details: results
        };
      } else {
        console.warn('Data migration completed with some errors');
        return {
          success: false,
          message: 'Data migration completed with errors',
          details: results
        };
      }
    } catch (error) {
      console.error('Data migration failed:', error);
      return {
        success: false,
        message: `Data migration failed: ${error}`,
        details: { error }
      };
    }
  }

  private async migrateSettings(): Promise<MigrationResult> {
    try {
      const settingsData = localStorage.getItem(this.SETTINGS_KEY);
      if (!settingsData) {
        return {
          success: true,
          message: 'No settings data found in localStorage'
        };
      }

      const settings: Settings = JSON.parse(settingsData);
      
      // Check if settings already exist in database
      const existingSettings = await databaseClient.query(
        'SELECT id FROM settings LIMIT 1'
      );

      if (existingSettings.rows.length > 0) {
        // Update existing settings
        await databaseClient.query(`
          UPDATE settings SET
            association_name = $1,
            about = $2,
            operating_hours = $3,
            production_time = $4,
            address = $5,
            whatsapp = $6,
            site = $7,
            instagram = $8,
            pix_key = $9,
            company_name = $10,
            bank_name = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
        `, [
          settings.associationName,
          settings.about,
          settings.operatingHours,
          settings.productionTime,
          settings.address,
          settings.whatsapp,
          settings.site,
          settings.instagram,
          settings.pixKey,
          settings.companyName,
          settings.bankName,
          existingSettings.rows[0].id
        ]);
      } else {
        // Insert new settings
        const result = await databaseClient.query(`
          INSERT INTO settings (
            association_name, about, operating_hours, production_time,
            address, whatsapp, site, instagram, pix_key, company_name, bank_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          settings.associationName,
          settings.about,
          settings.operatingHours,
          settings.productionTime,
          settings.address,
          settings.whatsapp,
          settings.site,
          settings.instagram,
          settings.pixKey,
          settings.companyName,
          settings.bankName
        ]);

        const settingsId = result.rows[0].id;

        // Migrate products
        if (settings.products && settings.products.length > 0) {
          for (const product of settings.products) {
            await databaseClient.query(`
              INSERT INTO products (name, price, description, icon, settings_id)
              VALUES ($1, $2, $3, $4, $5)
            `, [
              product.name,
              parseFloat(product.price.toString()),
              product.description || '',
              product.icon || '',
              settingsId
            ]);
          }
        }
      }

      return {
        success: true,
        message: `Settings migrated successfully (${settings.products?.length || 0} products)`
      };
    } catch (error) {
      console.error('Settings migration error:', error);
      return {
        success: false,
        message: `Settings migration failed: ${error}`
      };
    }
  }

  private async migrateReminders(): Promise<MigrationResult> {
    try {
      const remindersData = localStorage.getItem(this.REMINDERS_KEY);
      if (!remindersData) {
        return {
          success: true,
          message: 'No reminders data found in localStorage'
        };
      }

      const reminders: Reminder[] = JSON.parse(remindersData);
      let migratedCount = 0;

      for (const reminder of reminders) {
        // Check if reminder already exists
        const existing = await databaseClient.query(
          'SELECT id FROM reminders WHERE id = $1',
          [reminder.id]
        );

        if (existing.rows.length === 0) {
          // Insert reminder
          await databaseClient.query(`
            INSERT INTO reminders (
              id, title, due_date, due_time, is_completed, quote_id,
              patient_name, recurrence, end_date, parent_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            reminder.id,
            reminder.title,
            reminder.dueDate,
            reminder.dueTime || null,
            reminder.isCompleted,
            reminder.quoteId || null,
            reminder.patientName || null,
            reminder.recurrence || 'none',
            reminder.endDate || null,
            reminder.parentId || null
          ]);

          // Insert tasks
          if (reminder.tasks && reminder.tasks.length > 0) {
            for (const task of reminder.tasks) {
              await databaseClient.query(`
                INSERT INTO tasks (id, reminder_id, text, is_completed)
                VALUES ($1, $2, $3, $4)
              `, [
                task.id,
                reminder.id,
                task.text,
                task.isCompleted
              ]);
            }
          }

          migratedCount++;
        }
      }

      return {
        success: true,
        message: `${migratedCount} reminders migrated successfully`
      };
    } catch (error) {
      console.error('Reminders migration error:', error);
      return {
        success: false,
        message: `Reminders migration failed: ${error}`
      };
    }
  }

  private async migrateAdminUsers(): Promise<MigrationResult> {
    try {
      const adminData = localStorage.getItem(this.ADMIN_KEY);
      if (!adminData) {
        return {
          success: true,
          message: 'No admin user data found in localStorage'
        };
      }

      const adminCreds = JSON.parse(adminData);
      
      // Check if admin user already exists
      const existing = await databaseClient.query(
        'SELECT id FROM admin_users WHERE username = $1',
        [adminCreds.username]
      );

      if (existing.rows.length === 0) {
        await databaseClient.query(`
          INSERT INTO admin_users (username, password_hash, is_super_admin)
          VALUES ($1, $2, $3)
        `, [
          adminCreds.username,
          adminCreds.password, // Note: In production, this should be properly hashed
          true
        ]);

        return {
          success: true,
          message: 'Admin user migrated successfully'
        };
      } else {
        return {
          success: true,
          message: 'Admin user already exists in database'
        };
      }
    } catch (error) {
      console.error('Admin users migration error:', error);
      return {
        success: false,
        message: `Admin users migration failed: ${error}`
      };
    }
  }

  async createBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        settings: localStorage.getItem(this.SETTINGS_KEY),
        reminders: localStorage.getItem(this.REMINDERS_KEY),
        adminUsers: localStorage.getItem(this.ADMIN_KEY)
      };

      const backupData = JSON.stringify(backup, null, 2);
      const backupKey = `sativar_isis_backup_${Date.now()}`;
      
      // Store backup in localStorage with timestamp
      localStorage.setItem(backupKey, backupData);

      return {
        success: true,
        path: backupKey
      };
    } catch (error) {
      return {
        success: false,
        error: `Backup creation failed: ${error}`
      };
    }
  }

  async clearLocalStorageAfterMigration(): Promise<void> {
    try {
      // Only clear if migration was successful
      const confirmClear = confirm(
        'Migração concluída com sucesso! Deseja limpar os dados do localStorage? ' +
        'Isso removerá os dados locais, mas eles estarão seguros no banco de dados.'
      );

      if (confirmClear) {
        localStorage.removeItem(this.SETTINGS_KEY);
        localStorage.removeItem(this.REMINDERS_KEY);
        // Keep admin credentials for now
        console.log('localStorage data cleared after successful migration');
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

export const dataMigrationService = new DataMigrationService();
export default dataMigrationService;