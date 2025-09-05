import databaseService from './index';
import logger from '../../utils/logger';

export interface DataMigrationStepResult {
  success: boolean;
  message: string;
  details?: any;
}

export type SqlStep = { query: string; params?: any[] };

export const migrationUtilities = {
  async runInTransaction(steps: SqlStep[], name?: string): Promise<DataMigrationStepResult> {
    try {
      await databaseService.transaction(steps.map((s) => ({ query: s.query, params: s.params })));
      return { success: true, message: name ? `Migration '${name}' applied` : 'Migration applied' };
    } catch (error) {
      const message = name ? `Migration '${name}' failed` : 'Migration failed';
      logger.error(message, { error: (error as Error).message });
      return { success: false, message, details: { error: (error as Error).message } };
    }
  },

  async applyColumnDefault(table: string, column: string, defaultExpr: string): Promise<DataMigrationStepResult> {
    return this.runInTransaction([
      { query: `ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT ${defaultExpr}` }
    ], `set_default_${table}_${column}`);
  },

  async backfillColumn(table: string, column: string, valueExpr: string, whereClause?: string): Promise<DataMigrationStepResult> {
    const query = `UPDATE ${table} SET ${column} = ${valueExpr}` + (whereClause ? ` WHERE ${whereClause}` : '');
    return this.runInTransaction([{ query }], `backfill_${table}_${column}`);
  },

  async renameColumn(table: string, from: string, to: string): Promise<DataMigrationStepResult> {
    return this.runInTransaction([{ query: `ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}` }], `rename_${table}_${from}_to_${to}`);
  },

  async copyData(
    sourceTable: string,
    sourceColumn: string,
    destTable: string,
    destColumn: string,
    joinCondition: string,
    whereClause?: string
  ): Promise<DataMigrationStepResult> {
    const query =
      `UPDATE ${destTable} d SET ${destColumn} = s.${sourceColumn} FROM ${sourceTable} s WHERE ${joinCondition}` +
      (whereClause ? ` AND ${whereClause}` : '');
    return this.runInTransaction([{ query }], `copy_${sourceTable}_${sourceColumn}_to_${destTable}_${destColumn}`);
  },

  async listTableColumns(table: string): Promise<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]> {
    const res = await databaseService.query(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    return res.rows as any;
  },

  async selfTest(): Promise<DataMigrationStepResult> {
    try {
      // Create temp table, insert, backfill, verify, drop
      await databaseService.transaction([
        { query: 'CREATE TEMP TABLE tmp_migrate_test (id INT PRIMARY KEY, a INT, b INT)' },
        { query: 'INSERT INTO tmp_migrate_test (id, a) VALUES (1, 10), (2, 20), (3, NULL)' },
        { query: 'ALTER TABLE tmp_migrate_test ALTER COLUMN b SET DEFAULT 0' }
      ]);

      await this.backfillColumn('tmp_migrate_test', 'b', 'COALESCE(a, 0)');

      const res = await databaseService.query<{ sum: number; nulls: number }>(
        'SELECT COALESCE(SUM(b), 0) as sum, COUNT(*) FILTER (WHERE b IS NULL) as nulls FROM tmp_migrate_test'
      );

      const row = res.rows?.[0] as any;
      if (!row || row.nulls !== 0) {
        return { success: false, message: 'Self-test verification failed', details: row };
      }

      await databaseService.query('DROP TABLE IF EXISTS tmp_migrate_test');
      return { success: true, message: 'Migration utilities self-test passed', details: row };
    } catch (error) {
      return { success: false, message: 'Migration utilities self-test failed', details: { error: (error as Error).message } };
    }
  }
};

export default migrationUtilities;


