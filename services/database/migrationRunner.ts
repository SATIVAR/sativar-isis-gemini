import path from 'path';
import fs from 'fs/promises';
import databaseService from './index';
import logger from '../../utils/logger';
import { ErrorHandler, AppError, ErrorCode } from '../../utils/errorHandler';
import { dataMigrationService } from './dataMigrationService';

// Dynamically import backup service function only when needed
const getCreateBackupFunction = async () => {
  if (typeof window !== 'undefined') {
    // In browser environment, return a mock function
    return async () => ({ success: true, path: 'browser-mock-backup-path' });
  }
  
  try {
    const backupService = await import('./backupService');
    return backupService.createBackup;
  } catch (error) {
    logger.warn('Failed to import backup service', error);
    // Return a mock function if import fails
    return async () => ({ success: false, error: 'Backup service not available' });
  }
};

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensures the schema_migrations table exists in the database.
 */
async function ensureMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version VARCHAR(255) PRIMARY KEY NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await databaseService.query(query);
    logger.info(`Table '${MIGRATIONS_TABLE}' is ready.`);
  } catch (error) {
    throw ErrorHandler.handle(error, `Failed to create or verify '${MIGRATIONS_TABLE}' table.`);
  }
}

/**
 * Gets the list of migrations that have already been applied.
 * @returns A Set containing the versions of applied migrations.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await databaseService.query(`SELECT version FROM ${MIGRATIONS_TABLE}`);
    return new Set(result.rows.map((row) => row.version));
  } catch (error) {
    throw ErrorHandler.handle(error, 'Failed to retrieve applied migrations.');
  }
}

/**
 * Gets the list of available migration files from the migrations directory.
 * @returns An array of migration filenames, sorted chronologically.
 */
async function getAvailableMigrations(): Promise<string[]> {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files.filter((file) => file.endsWith('.sql')).sort();
  } catch (error) {
    throw ErrorHandler.handle(error, 'Failed to read migration files.');
  }
}

/**
 * Runs the database migrations.
 */
export async function runMigrations(): Promise<void> {
  logger.info('Starting database migration process...');

  try {
    // 1. Create a backup before running migrations
    logger.info('Creating a pre-migration backup...');
    const createBackup = await getCreateBackupFunction();
    const backupResult = await createBackup();
    if (!backupResult.success) {
      // Se o backup falhar, impede a execução das migrações
      throw new AppError(ErrorCode.BACKUP_FAILED, (backupResult as any).error || 'Pre-migration backup failed. Aborting migrations.');
    }
    logger.info(`Pre-migration backup created successfully at ${(backupResult as any).path}`);

    // 2. Proceed with migrations
    await ensureMigrationsTable();
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = await getAvailableMigrations();

    let migrationsApplied = 0;

    for (const file of availableMigrations) {
      const version = path.basename(file, '.sql');

      if (appliedMigrations.has(version)) {
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, 'utf-8');

      try {
        await databaseService.transaction([{ query: sql }]);
        await databaseService.query(`INSERT INTO ${MIGRATIONS_TABLE} (version) VALUES ($1)`, [version]);
        logger.info(`Successfully applied migration: ${file}`);
        migrationsApplied++;
      } catch (transactionError) {
        const appError = ErrorHandler.handle(transactionError, `Failed to apply migration: ${file}`);
        logger.error(appError.message, { details: appError.details });
        // Stop further migrations if one fails
        throw appError;
      }
    }

    // 3. Migrate localStorage data to database
    logger.info('Migrating localStorage data to database...');
    const migrationResult = await dataMigrationService.migrateLocalStorageData();
    if (!migrationResult.success) {
      logger.error('Data migration failed:', migrationResult.message);
    } else {
      logger.info('Data migration completed:', migrationResult.message);
      // Optionally clear localStorage after successful migration
      // await dataMigrationService.clearLocalStorageAfterMigration();
    }

    if (migrationsApplied === 0) {
      logger.info('Database is already up to date.');
    } else {
      logger.info(`Successfully applied ${migrationsApplied} new migration(s).`);
    }

  } catch (error) {
    const appError = error instanceof AppError ? error : ErrorHandler.handle(error, 'An unexpected error occurred during the migration process.');
    logger.error('Migration process failed.', { details: appError.details });
    // Optionally, rethrow or handle to prevent application startup
    throw appError;
  }
}