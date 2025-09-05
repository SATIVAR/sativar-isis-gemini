import { apiClient as databaseClient } from './apiClient';

export interface Migration {
  version: string;
  description: string;
  up: string;
  down?: string;
}

// Define all migrations
export const migrations: Migration[] = [
  {
    version: '001',
    description: 'Create initial schema',
    up: `
      -- PostgreSQL 13+ has gen_random_uuid() built-in, no extension needed
      
      -- Settings table for application configuration
      CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          association_name VARCHAR(255) NOT NULL DEFAULT '[Insira o Nome da Associação aqui]',
          about TEXT DEFAULT '[Insira uma breve descrição sobre a associação aqui]',
          operating_hours VARCHAR(255) DEFAULT 'Segunda a Sexta, das 9h às 18h',
          production_time VARCHAR(255) DEFAULT '7-10 dias úteis',
          address TEXT DEFAULT '[Insira o Endereço completo aqui]',
          whatsapp VARCHAR(50) DEFAULT '[Insira o WhatsApp com DDD aqui]',
          site VARCHAR(255) DEFAULT '[Insira o site aqui]',
          instagram VARCHAR(100) DEFAULT '[Insira o Instagram aqui]',
          pix_key VARCHAR(255) DEFAULT '[Insira a Chave PIX aqui]',
          company_name VARCHAR(255) DEFAULT '[Insira a Razão Social aqui]',
          bank_name VARCHAR(255) DEFAULT '[Insira o Nome do Banco aqui]',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Products table for medical products catalog
      CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          description TEXT,
          icon VARCHAR(255),
          settings_id INTEGER REFERENCES settings(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Reminders table for task management
      CREATE TABLE IF NOT EXISTS reminders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          due_date DATE NOT NULL,
          due_time TIME,
          is_completed BOOLEAN DEFAULT FALSE,
          quote_id UUID,
          patient_name VARCHAR(255),
          recurrence VARCHAR(20) DEFAULT 'none',
          end_date DATE,
          parent_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Tasks table for reminder subtasks
      CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Quotes table for prescription quotes
      CREATE TABLE IF NOT EXISTS quotes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_name VARCHAR(255) NOT NULL,
          internal_summary TEXT,
          patient_message TEXT,
          medical_history TEXT,
          doctor_notes TEXT,
          observations TEXT,
          validity VARCHAR(100),
          total_value VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Quoted products table for quote line items
      CREATE TABLE IF NOT EXISTS quoted_products (
          id SERIAL PRIMARY KEY,
          quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          quantity VARCHAR(50),
          concentration VARCHAR(100),
          status VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Admin users table for authentication
      CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_super_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMPTZ
      );

      -- Migration tracking table
      CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(50) PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP TABLE IF EXISTS quoted_products;
      DROP TABLE IF EXISTS quotes;
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS reminders;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS admin_users;
      DROP TABLE IF EXISTS schema_migrations;
    `
  },
  {
    version: '002',
    description: 'Add indexes for performance',
    up: `
      CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
      CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_reminder_id ON tasks(reminder_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_patient_name ON quotes(patient_name);
      CREATE INDEX IF NOT EXISTS idx_quoted_products_quote_id ON quoted_products(quote_id);
      CREATE INDEX IF NOT EXISTS idx_products_settings_id ON products(settings_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_reminders_due_date;
      DROP INDEX IF EXISTS idx_reminders_is_completed;
      DROP INDEX IF EXISTS idx_tasks_reminder_id;
      DROP INDEX IF EXISTS idx_quotes_patient_name;
      DROP INDEX IF EXISTS idx_quoted_products_quote_id;
      DROP INDEX IF EXISTS idx_products_settings_id;
    `
  }
];

class MigrationService {
  private async ensureMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await databaseClient.query(query);
  }

  private async getAppliedMigrations(): Promise<Set<string>> {
    try {
      const result = await databaseClient.query('SELECT version FROM schema_migrations');
      return new Set(result.rows.map((row: any) => row.version));
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return new Set();
    }
  }

  async runMigrations(): Promise<{ success: boolean; appliedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let appliedCount = 0;

    try {
      await this.ensureMigrationsTable();
      const appliedMigrations = await this.getAppliedMigrations();

      for (const migration of migrations) {
        if (appliedMigrations.has(migration.version)) {
          continue;
        }

        try {
          console.log(`Applying migration ${migration.version}: ${migration.description}`);
          
          // Split the migration into individual statements
          const statements = migration.up
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const statement of statements) {
            if (statement.trim()) {
              await databaseClient.query(statement);
            }
          }

          // Mark migration as applied
          await databaseClient.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [migration.version]
          );

          appliedCount++;
          console.log(`Migration ${migration.version} applied successfully`);
        } catch (error) {
          const errorMsg = `Failed to apply migration ${migration.version}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          break; // Stop on first error
        }
      }

      return {
        success: errors.length === 0,
        appliedCount,
        errors
      };
    } catch (error) {
      const errorMsg = `Migration process failed: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        appliedCount,
        errors: [errorMsg]
      };
    }
  }

  async rollbackMigration(version: string): Promise<{ success: boolean; error?: string }> {
    try {
      const migration = migrations.find(m => m.version === version);
      if (!migration || !migration.down) {
        return {
          success: false,
          error: `Migration ${version} not found or has no rollback script`
        };
      }

      // Execute rollback
      const statements = migration.down
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await databaseClient.query(statement);
        }
      }

      // Remove from migrations table
      await databaseClient.query(
        'DELETE FROM schema_migrations WHERE version = $1',
        [version]
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to rollback migration ${version}: ${error}`
      };
    }
  }

  async getMigrationStatus(): Promise<Array<{ version: string; description: string; applied: boolean; appliedAt?: Date }>> {
    try {
      const appliedMigrations = await databaseClient.query(
        'SELECT version, applied_at FROM schema_migrations ORDER BY version'
      );
      
      const appliedMap = new Map(
        appliedMigrations.rows.map((row: any) => [row.version, row.applied_at])
      );

      return migrations.map(migration => ({
        version: migration.version,
        description: migration.description,
        applied: appliedMap.has(migration.version),
        appliedAt: appliedMap.get(migration.version)
      }));
    } catch (error) {
      console.error('Error getting migration status:', error);
      return migrations.map(migration => ({
        version: migration.version,
        description: migration.description,
        applied: false
      }));
    }
  }
}

export const migrationService = new MigrationService();
export default migrationService;