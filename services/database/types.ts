export interface TransactionQuery {
  query: string;
  params?: any[];
}

export enum ConnectionStatusEnum {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Connecting = 'connecting'
}

export interface ConnectionStatus {
  status: ConnectionStatusEnum;
  latency?: number;
  error?: string;
  timestamp: Date;
}

// Conditional type definition for QueryResult based on environment
type QueryResult<T> = typeof window extends undefined ? import('pg').QueryResult<T> : { rows: T[], rowCount: number };

export interface DatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionStatus(): ConnectionStatus;
  query<T>(query: string, params?: any[]): Promise<QueryResult<T>>;
  transaction(queries: TransactionQuery[]): Promise<QueryResult<any>[]>;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxConnections?: number;
}

export interface Migration {
  version: string;
  description: string;
  up: string;
  down: string;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  errors: MigrationError[];
  backupPath?: string;
}

export interface MigrationError {
  version: string;
  error: string;
}

export interface MigrationStatus {
  version: string;
  description: string;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

export interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

// Enhanced core data models (database-oriented) - does not replace UI types in /types.ts
export interface TaskModel {
  id: string;
  reminderId: string;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderPriority = 'low' | 'medium' | 'high';

export interface ReminderModel {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  dueTime?: string;
  isCompleted: boolean;
  priority?: ReminderPriority;
  recurrence?: any; // RecurrencePattern placeholder
  subtasks: TaskModel[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SyncOperation {
  id: string;
  entityType: 'reminder' | 'task';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  retryCount: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  recordCount: number;
  checksum: string;
  filePath: string;
}

// Validation and operation result utility types
export interface ValidationErrorInfo {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarningInfo {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorInfo[];
  warnings: ValidationWarningInfo[];
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConflictInfo {
  entityType: 'reminder' | 'task';
  entityId: string;
  localVersion?: number;
  remoteVersion?: number;
  message: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
}

export interface SyncResult {
  processed: number;
  successful: number;
  failed: number;
  conflicts: ConflictInfo[];
}

// Diagnostics and Recovery types
export interface BackupStatusInfo {
  exists: boolean;
  latestPath?: string;
  latestTimestamp?: Date;
  verified?: boolean;
  expectedChecksum?: string;
  actualChecksum?: string;
}

export interface TableHealthInfo {
  table: string;
  exists: boolean;
  rowCount?: number;
}

export interface DiagnosticsReport {
  timestamp: Date;
  databaseConnected: boolean;
  connectionStatus: ConnectionStatus;
  slowQueryWarning?: boolean;
  tables: TableHealthInfo[];
  fallbackModeActive: boolean;
  fallbackReason?: string | null;
  fallbackQueueSize: number;
  backup: BackupStatusInfo;
  recommendations: string[];
}

// Metrics
export interface SystemMetrics {
  databaseConnections: number;
  syncQueueSize: number;
  lastSyncTime?: Date;
  errorRate?: number;
  averageResponseTimeMs?: number;
  backupStatus?: BackupStatusInfo;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  details?: any;
}