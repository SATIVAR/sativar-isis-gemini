import databaseService from './index';
import logger from '../../utils/logger';

export interface MaintenanceOperationResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface SlowQueryInfo {
  query: string;
  calls: number;
  totalTimeMs: number;
  meanTimeMs: number;
  rows: number;
}

export interface TableStatInfo {
  schemaname: string;
  relname: string;
  seqScan: number;
  seqTupRead: number;
  idxScan: number;
  idxTupFetch: number;
  nTupIns: number;
  nTupUpd: number;
  nTupDel: number;
  nLiveTup: number;
  nDeadTup: number;
  lastVacuum?: Date | null;
  lastAutovacuum?: Date | null;
  lastAnalyze?: Date | null;
  lastAutoanalyze?: Date | null;
}

async function tryCreatePgStatStatements(): Promise<void> {
  try {
    await databaseService.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
  } catch (error) {
    // Extension may not be permitted; log and continue gracefully
    logger.warn('pg_stat_statements extension not available', { error: (error as Error).message });
  }
}

export const maintenanceService = {
  async cleanupOrphanedTasks(): Promise<MaintenanceOperationResult> {
    try {
      const res = await databaseService.query<{ deleted: number }>(
        'WITH del AS (\n          DELETE FROM tasks t\n          WHERE NOT EXISTS (SELECT 1 FROM reminders r WHERE r.id = t.reminder_id)\n          RETURNING 1\n        ) SELECT COUNT(*)::int as deleted FROM del'
      );
      return { success: true, message: 'Orphaned tasks cleanup completed', details: { deleted: (res.rows?.[0] as any)?.deleted ?? 0 } };
    } catch (error) {
      return { success: false, message: 'Failed to cleanup orphaned tasks', details: { error: (error as Error).message } };
    }
  },

  async cleanupOldNotificationLogs(days: number = 90): Promise<MaintenanceOperationResult> {
    try {
      const res = await databaseService.query<{ deleted: number }>(
        'WITH del AS (DELETE FROM notification_log WHERE sent_at < NOW() - ($1 || \n" days")::interval RETURNING 1) SELECT COUNT(*)::int as deleted FROM del',
        [String(days)]
      );
      return { success: true, message: `Deleted notification logs older than ${days} days`, details: { deleted: (res.rows?.[0] as any)?.deleted ?? 0 } };
    } catch (error) {
      return { success: false, message: 'Failed to cleanup notification logs', details: { error: (error as Error).message } };
    }
  },

  async vacuumAnalyzeAll(): Promise<MaintenanceOperationResult> {
    try {
      await databaseService.query('VACUUM (VERBOSE, ANALYZE)');
      return { success: true, message: 'VACUUM ANALYZE executed for all tables' };
    } catch (error) {
      return { success: false, message: 'VACUUM ANALYZE failed', details: { error: (error as Error).message } };
    }
  },

  async analyzeTable(table: string): Promise<MaintenanceOperationResult> {
    try {
      await databaseService.query(`ANALYZE ${table}`);
      return { success: true, message: `ANALYZE completed for ${table}` };
    } catch (error) {
      return { success: false, message: `ANALYZE failed for ${table}`, details: { error: (error as Error).message } };
    }
  },

  async reindexAll(): Promise<MaintenanceOperationResult> {
    try {
      await databaseService.query('REINDEX DATABASE CONCURRENTLY');
      return { success: true, message: 'Reindex started (concurrently) for database' };
    } catch (error) {
      return { success: false, message: 'Reindex failed', details: { error: (error as Error).message } };
    }
  },

  async tableStats(): Promise<TableStatInfo[]> {
    try {
      const res = await databaseService.query<any>(
        `SELECT s.schemaname, s.relname,
                s.seq_scan as "seqScan", s.seq_tup_read as "seqTupRead",
                s.idx_scan as "idxScan", s.idx_tup_fetch as "idxTupFetch",
                s.n_tup_ins as "nTupIns", s.n_tup_upd as "nTupUpd",
                s.n_tup_del as "nTupDel", s.n_live_tup as "nLiveTup",
                s.n_dead_tup as "nDeadTup",
                i.last_vacuum as "lastVacuum", i.last_autovacuum as "lastAutovacuum",
                i.last_analyze as "lastAnalyze", i.last_autoanalyze as "lastAutoanalyze"
         FROM pg_stat_user_tables s
         LEFT JOIN pg_stat_all_tables i ON i.relid = s.relid
         ORDER BY s.schemaname, s.relname`
      );
      return res.rows as TableStatInfo[];
    } catch (error) {
      logger.error('Failed to fetch table stats', { error: (error as Error).message });
      return [];
    }
  },

  async slowQueries(limit: number = 20): Promise<SlowQueryInfo[]> {
    await tryCreatePgStatStatements();
    try {
      const res = await databaseService.query<any>(
        `SELECT query,
                calls,
                total_time as "totalTimeMs",
                mean_time as "meanTimeMs",
                rows
         FROM pg_stat_statements
         WHERE query NOT ILIKE '%pg_stat_statements%'
         ORDER BY mean_time DESC
         LIMIT $1`,
        [limit]
      );
      return res.rows as SlowQueryInfo[];
    } catch (error) {
      // If extension not available, return empty list gracefully
      logger.warn('Unable to read slow queries (pg_stat_statements unavailable)', { error: (error as Error).message });
      return [];
    }
  },

  async selfTest(): Promise<MaintenanceOperationResult> {
    try {
      // Create temp tables to simulate orphan cleanup
      await databaseService.transaction([
        { query: 'CREATE TEMP TABLE tmp_parent (id uuid PRIMARY KEY DEFAULT gen_random_uuid())' },
        { query: 'CREATE TEMP TABLE tmp_child (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_id uuid NOT NULL)' },
        { query: 'INSERT INTO tmp_parent DEFAULT VALUES' },
        { query: 'INSERT INTO tmp_child (parent_id) SELECT id FROM tmp_parent' },
        { query: 'INSERT INTO tmp_child (parent_id) VALUES (gen_random_uuid())' } // orphan row
      ]);

      // Run a VACUUM ANALYZE on temp schema (no-op allowed) and fetch stats
      await databaseService.query('VACUUM (ANALYZE)');

      // Count before cleanup
      const before = await databaseService.query<{ cnt: number }>('SELECT COUNT(*)::int as cnt FROM tmp_child c WHERE NOT EXISTS (SELECT 1 FROM tmp_parent p WHERE p.id = c.parent_id)');

      // Reuse cleanup logic by adapting it to temp tables
      await databaseService.query(
        'WITH del AS (DELETE FROM tmp_child c WHERE NOT EXISTS (SELECT 1 FROM tmp_parent p WHERE p.id = c.parent_id) RETURNING 1) SELECT COUNT(*) FROM del'
      );

      const after = await databaseService.query<{ cnt: number }>('SELECT COUNT(*)::int as cnt FROM tmp_child c WHERE NOT EXISTS (SELECT 1 FROM tmp_parent p WHERE p.id = c.parent_id)');

      await databaseService.query('DROP TABLE IF EXISTS tmp_child');
      await databaseService.query('DROP TABLE IF EXISTS tmp_parent');

      const deleted = (before.rows?.[0] as any)?.cnt - (after.rows?.[0] as any)?.cnt;
      return { success: deleted > 0 && (after.rows?.[0] as any)?.cnt === 0, message: 'Maintenance utilities self-test completed', details: { deleted } };
    } catch (error) {
      return { success: false, message: 'Maintenance utilities self-test failed', details: { error: (error as Error).message } };
    }
  }
};

export default maintenanceService;


