import { PostgreSQLService } from './PostgreSQLService';
export { dataPreservationLayer } from './dataPreservationLayer';
export { notificationRepository } from './repositories/NotificationRepository';
export { recoveryManager } from './recoveryManager';
export { performanceAnalysisService } from './performanceAnalysisService';

/**
 * Singleton instance of the PostgreSQLService.
 * This ensures that the entire application shares the same database connection pool.
 */
let databaseService: any = undefined;

// Only initialize the database service in Node.js environment
if (typeof window === 'undefined') {
  const { PostgreSQLService } = require('./PostgreSQLService');
  databaseService = new PostgreSQLService();
  
  // Start automated backups in Node environment
  try {
    import('./backupService').then(backupService => {
      backupService.startBackupScheduler();
    });
  } catch {
    // ignore if not available
  }
} else {
  // Stub seguro para evitar undefined até o carregamento real
  const browserDatabaseService = {
    _isConnected: false,
    _apiClient: null,
    _fallbackManager: null,
    _isInitialized: false,

    async initialize() {
      if (this._isInitialized) return;
      const [fallbackManagerModule, apiClientModule] = await Promise.all([
        import('./fallbackManager'),
        import('./apiClient')
      ]);
      this._fallbackManager = fallbackManagerModule.fallbackManager;
      this._apiClient = apiClientModule.apiClient;
      this._isInitialized = true;
    },

    async connect() {
      await this.initialize();
      try {
        const dbStatus = await this._apiClient.getDatabaseStatus();
        if (dbStatus.connected) {
          this._isConnected = true;
          await this._fallbackManager.disableFallbackMode();
        } else {
          this._isConnected = false;
          // Don't enable fallback mode here, let the caller decide
        }
      } catch (error) {
        console.warn('Failed to check database status via API:', error);
        this._isConnected = false;
      }
    },

    disconnect() {
      // No real disconnect action via API, just update state
      this._isConnected = false;
    },

    isConnected() {
      if (!this._isInitialized) return false;
      return this._isConnected && !this._fallbackManager.isInFallbackMode();
    },

    getConnectionStatus() {
      if (!this._isInitialized) {
        return { status: 'disconnected', timestamp: new Date() };
      }
      const status = this.isConnected() ? 'connected' : 'disconnected';
      return { status, timestamp: new Date() };
    },

    async query(query, params) {
      await this.initialize();
      return this._apiClient.query(query, params);
    },
    
    async transaction(queries) {
        // Not implemented for browser client
        console.warn("Transactions are not supported in the browser-side database service.");
        return [];
    }
  };

  // Assign to the export
  databaseService = browserDatabaseService;

  // Initialize and expose to window
  if (typeof window !== 'undefined') {
    (window as any).databaseService = databaseService;
    databaseService.initialize();
  }
}

// Export default para ESM, sempre após a definição inicial
export default databaseService;