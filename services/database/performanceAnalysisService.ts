import databaseService from './index';
import logger from '../../utils/logger';
import { metrics } from './metrics';

export interface QueryPerformanceInfo {
  query: string;
  executionTimeMs: number;
  rowsAffected: number;
  timestamp: Date;
}

export interface PerformanceAnalysisReport {
  slowQueries: QueryPerformanceInfo[];
  connectionStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  };
  cacheHitRate?: number;
  databaseSizeMB?: number;
  tableSizes: Array<{
    tableName: string;
    sizeMB: number;
    rowCount: number;
  }>;
  indexUsage: Array<{
    tableName: string;
    indexName: string;
    scans: number;
    tuplesRead: number;
    tuplesFetched: number;
  }>;
  recommendations: string[];
}

export class PerformanceAnalysisService {
  private static instance: PerformanceAnalysisService;

  private constructor() {}

  static getInstance(): PerformanceAnalysisService {
    if (!PerformanceAnalysisService.instance) {
      PerformanceAnalysisService.instance = new PerformanceAnalysisService();
    }
    return PerformanceAnalysisService.instance;
  }

  /**
   * Analyzes database performance and generates a comprehensive report
   */
  async analyzePerformance(): Promise<PerformanceAnalysisReport> {
    try {
      const [
        slowQueries,
        connectionStats,
        tableSizes,
        indexUsage,
        databaseSize
      ] = await Promise.all([
        this.getSlowQueries(),
        this.getConnectionStats(),
        this.getTableSizes(),
        this.getIndexUsage(),
        this.getDatabaseSize()
      ]);

      const recommendations = this.generateRecommendations(
        slowQueries,
        connectionStats,
        tableSizes,
        indexUsage
      );

      return {
        slowQueries,
        connectionStats,
        tableSizes,
        indexUsage,
        databaseSizeMB: databaseSize,
        recommendations
      };
    } catch (error) {
      logger.error('Performance analysis failed', error);
      throw error;
    }
  }

  /**
   * Gets the slowest queries from pg_stat_statements
   */
  private async getSlowQueries(limit: number = 20): Promise<QueryPerformanceInfo[]> {
    try {
      // Try to create the extension if it doesn't exist
      await databaseService.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');

      const result = await databaseService.query<any>(
        `SELECT 
          query,
          mean_time as execution_time_ms,
          calls,
          rows as rows_affected
        FROM pg_stat_statements 
        WHERE query NOT ILIKE '%pg_stat_statements%'
        ORDER BY mean_time DESC 
        LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        query: row.query,
        executionTimeMs: parseFloat(row.execution_time_ms),
        rowsAffected: parseInt(row.rows_affected),
        timestamp: new Date()
      }));
    } catch (error) {
      logger.warn('Unable to fetch slow queries (pg_stat_statements may not be available)', error);
      return [];
    }
  }

  /**
   * Gets database connection statistics
   */
  private async getConnectionStats(): Promise<PerformanceAnalysisReport['connectionStats']> {
    try {
      const result = await databaseService.query<any>(
        `SELECT 
          COUNT(*) as total_connections,
          COUNT(*) FILTER (WHERE state = 'active') as active_connections,
          COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()`
      );

      const row = result.rows[0];
      return {
        totalConnections: parseInt(row.total_connections),
        activeConnections: parseInt(row.active_connections),
        idleConnections: parseInt(row.idle_connections)
      };
    } catch (error) {
      logger.warn('Unable to fetch connection stats', error);
      // Return default values from pool if available
      try {
        // Access pool internals if present
        const pool: any = (databaseService as any)['pool'];
        return {
          totalConnections: pool?.totalCount || 0,
          activeConnections: pool?.activeCount || 0,
          idleConnections: pool?.idleCount || 0
        };
      } catch (e) {
        return {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0
        };
      }
    }
  }

  /**
   * Gets table sizes and row counts
   */
  private async getTableSizes(): Promise<PerformanceAnalysisReport['tableSizes']> {
    try {
      const result = await databaseService.query<any>(
        `SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as rowcount
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC`
      );

      return result.rows.map(row => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        sizeMB: Math.round(parseInt(row.size_bytes) / (1024 * 1024) * 100) / 100,
        rowCount: parseInt(row.rowcount)
      }));
    } catch (error) {
      logger.warn('Unable to fetch table sizes', error);
      return [];
    }
  }

  /**
   * Gets index usage statistics
   */
  private async getIndexUsage(): Promise<PerformanceAnalysisReport['indexUsage']> {
    try {
      const result = await databaseService.query<any>(
        `SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC`
      );

      return result.rows.map(row => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        indexName: row.indexname,
        scans: parseInt(row.scans),
        tuplesRead: parseInt(row.tuples_read),
        tuplesFetched: parseInt(row.tuples_fetched)
      }));
    } catch (error) {
      logger.warn('Unable to fetch index usage stats', error);
      return [];
    }
  }

  /**
   * Gets the total database size
   */
  private async getDatabaseSize(): Promise<number | undefined> {
    try {
      const result = await databaseService.query<any>(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                pg_database_size(current_database()) as size_bytes`
      );

      const row = result.rows[0];
      return Math.round(parseInt(row.size_bytes) / (1024 * 1024) * 100) / 100;
    } catch (error) {
      logger.warn('Unable to fetch database size', error);
      return undefined;
    }
  }

  /**
   * Generates performance recommendations based on the analysis
   */
  private generateRecommendations(
    slowQueries: QueryPerformanceInfo[],
    connectionStats: PerformanceAnalysisReport['connectionStats'],
    tableSizes: PerformanceAnalysisReport['tableSizes'],
    indexUsage: PerformanceAnalysisReport['indexUsage']
  ): string[] {
    const recommendations: string[] = [];

    // Check for slow queries
    if (slowQueries.length > 0) {
      const verySlowQueries = slowQueries.filter(q => q.executionTimeMs > 1000);
      if (verySlowQueries.length > 0) {
        recommendations.push(
          `Found ${verySlowQueries.length} queries taking more than 1 second. Consider adding indexes or optimizing these queries.`
        );
      }
    }

    // Check connection usage
    if (connectionStats.totalConnections > 80) {
      recommendations.push(
        `High number of database connections (${connectionStats.totalConnections}). Consider optimizing connection pooling.`
      );
    }

    // Check for large tables
    const largeTables = tableSizes.filter(t => t.sizeMB > 100);
    if (largeTables.length > 0) {
      recommendations.push(
        `Found ${largeTables.length} large tables (>100MB). Consider partitioning or archiving old data.`
      );
    }

    // Check for unused indexes
    const unusedIndexes = indexUsage.filter(idx => idx.scans === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(
        `Found ${unusedIndexes.length} indexes with no scans. Consider removing unused indexes to improve write performance.`
      );
    }

    // Check for tables without indexes
    const tablesWithoutIndexes: string[] = [];
    // This would require a more complex query to determine, so we'll just add a general recommendation
    recommendations.push(
      'Review tables without indexes on frequently queried columns to improve query performance.'
    );

    return recommendations;
  }

  /**
   * Gets real-time performance metrics
   */
  getRealTimeMetrics(): any {
    return metrics.getMetrics();
  }
}

export const performanceAnalysisService = PerformanceAnalysisService.getInstance();