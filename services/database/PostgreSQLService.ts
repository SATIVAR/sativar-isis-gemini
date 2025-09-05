import { Pool, PoolClient, QueryResult } from 'pg';
// Only import pg in Node.js environment
let Pool: any, PoolClient: any, QueryResult: any;
if (typeof window === 'undefined') {
  const pg = require('pg');
  Pool = pg.Pool;
  PoolClient = pg.PoolClient;
  QueryResult = pg.QueryResult;
}

import { DatabaseService, TransactionQuery, ConnectionStatus, ConnectionStatusEnum } from './types';
import logger from '../../utils/logger';
import { ErrorHandler, AppError, ErrorCode } from '../../utils/errorHandler';
import config from '../../config';

/**
 * PostgreSQLService provides an implementation of the DatabaseService for PostgreSQL.
 * It handles connection management, query execution, and transaction control.
 */
export class PostgreSQLService implements DatabaseService {
  private pool: any;
  private connectionStatus: ConnectionStatusEnum = ConnectionStatusEnum.Disconnected;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 5000; // 5 seconds

  constructor() {
    // Only initialize the pool in Node.js environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    // Map our app config to pg.Pool configuration
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      user: (config.database as any).username || (config.database as any).user,
      password: config.database.password,
      database: config.database.database,
      ssl: (config.database as any).ssl,
      max: (config.database as any).maxConnections,
      connectionTimeoutMillis: (config.database as any).connectionTimeout
    });
    this.setupEventHandlers();
  }

  /**
   * Sets up event handlers for the connection pool.
   */
  private setupEventHandlers(): void {
    // Skip in browser environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    this.pool.on('connect', () => {
      this.connectionStatus = ConnectionStatusEnum.Connected;
      this.reconnectAttempts = 0;
      logger.info('Successfully connected to the database.');
    });

    this.pool.on('error', (err: any) => {
      logger.error('Database pool error:', err);
      this.connectionStatus = ConnectionStatusEnum.Disconnected;
      this.handleReconnection();
    });
  }

  /**
   * Attempts to reconnect to the database with exponential backoff.
   */
  private handleReconnection(): void {
    // Skip in browser environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      logger.info(`Attempting to reconnect in ${delay / 1000}s...`);

      setTimeout(() => {
        this.connect().catch(() => {}); // Catch to avoid unhandled promise rejection
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached. Could not connect to the database.');
    }
  }

  /**
   * Establishes a connection to the database.
   * @returns A promise that resolves when the connection is established.
   */
  async connect(): Promise<void> {
    // Skip in browser environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    if (this.connectionStatus === ConnectionStatusEnum.Connected) {
      return;
    }

    this.connectionStatus = ConnectionStatusEnum.Connecting;
    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      this.connectionStatus = ConnectionStatusEnum.Disconnected;
      const appError = ErrorHandler.handle(error, 'Failed to connect to the database');
      logger.error(appError.message, { details: appError.details });
      this.handleReconnection();
      throw appError;
    }
  }

  /**
   * Checks if the database is currently connected.
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    // Always return false in browser environment
    if (typeof window !== 'undefined') {
      return false;
    }
    
    return this.connectionStatus === ConnectionStatusEnum.Connected;
  }

  /**
   * Disconnects from the database.
   * @returns A promise that resolves when the connection is closed.
   */
  async disconnect(): Promise<void> {
    // Skip in browser environment
    if (typeof window !== 'undefined' || this.connectionStatus === ConnectionStatusEnum.Disconnected) {
      return;
    }
    
    await this.pool.end();
    this.connectionStatus = ConnectionStatusEnum.Disconnected;
    logger.info('Database connection closed.');
  }

  /**
   * Gets the current connection status.
   * @returns The current connection status.
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      status: this.connectionStatus,
      timestamp: new Date()
    };
  }

  /**
   * Executes a single database query.
   * @param query The SQL query string.
   * @param params An array of parameters for the query.
   * @returns A promise that resolves with the query result.
   */
  async query<T>(query: string, params: any[] = []): Promise<any> {
    // Return mock result in browser environment
    if (typeof window !== 'undefined') {
      return { rows: [], rowCount: 0 };
    }
    
    try {
      const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const result = await this.pool.query<T>(query, params);
      const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const durationMs = Math.round(end - start);
      if (durationMs > 200) {
        logger.warn('Slow query detected', { durationMs, query: query.slice(0, 120) });
      }
      return result;
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Database query failed');
      logger.error(appError.message, { query, params, details: appError.details });
      throw appError;
    }
  }

  /**
   * Executes a series of queries within a transaction.
   * @param queries An array of TransactionQuery objects.
   * @returns A promise that resolves with the results of all queries.
   */
  async transaction(queries: TransactionQuery[]): Promise<any[]> {
    // Return mock result in browser environment
    if (typeof window !== 'undefined') {
      return [];
    }
    
    const client: any = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const results: any[] = [];

      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }

      await client.query('COMMIT');
      const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const durationMs = Math.round(end - start);
      if (durationMs > 500) {
        logger.warn('Slow transaction detected', { durationMs, queries: queries.length });
      }
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      const appError = ErrorHandler.handle(error, 'Database transaction failed');
      logger.error(appError.message, { details: appError.details });
      throw appError;
    } finally {
      client.release();
    }
  }
}