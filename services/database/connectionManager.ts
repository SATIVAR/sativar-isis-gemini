import { apiClient } from './apiClient';
import { fallbackManager } from './fallbackManager';
import logger from '../../utils/logger';

export class ConnectionManager {
  private static instance: ConnectionManager;
  private isConnected = false;
  private lastCheckTime = 0;
  private checkInterval = 30000; // 30 seconds
  private retryAttempts = 0;
  private maxRetryAttempts = 5;

  private constructor() {
    this.startConnectionMonitoring();
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - this.lastCheckTime < 5000) {
      return this.isConnected;
    }
    
    this.lastCheckTime = now;
    
    try {
      const health = await apiClient.healthCheck();
      const dbStatus = await apiClient.getDatabaseStatus();
      
      const connected = health.status === 'OK' && dbStatus.connected;
      
      if (connected && !this.isConnected) {
        // Connection restored
        this.isConnected = true;
        this.retryAttempts = 0;
        await fallbackManager.disableFallbackMode();
        logger.info('Database connection restored');
      } else if (!connected && this.isConnected) {
        // Connection lost
        this.isConnected = false;
        await fallbackManager.enableFallbackMode('network_error');
        logger.warn('Database connection lost');
      }
      
      return connected;
    } catch (error) {
      if (this.isConnected) {
        this.isConnected = false;
        await fallbackManager.enableFallbackMode('network_error');
        logger.error('Database connection check failed', error);
      }
      
      this.retryAttempts++;
      return false;
    }
  }

  private startConnectionMonitoring(): void {
    // Initial check
    this.checkConnection();
    
    // Periodic checks
    setInterval(() => {
      this.checkConnection();
    }, this.checkInterval);
    
    // Check on window focus (if in browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.checkConnection();
      });
      
      // Check on network status change
      window.addEventListener('online', () => {
        logger.info('Network came online, checking database connection');
        this.checkConnection();
      });
      
      window.addEventListener('offline', () => {
        logger.warn('Network went offline');
        this.isConnected = false;
        fallbackManager.enableFallbackMode('network_offline');
      });
    }
  }

  getConnectionStatus(): {
    connected: boolean;
    lastCheck: number;
    retryAttempts: number;
    fallbackMode: boolean;
  } {
    return {
      connected: this.isConnected,
      lastCheck: this.lastCheckTime,
      retryAttempts: this.retryAttempts,
      fallbackMode: fallbackManager.isInFallbackMode()
    };
  }

  async forceReconnect(): Promise<boolean> {
    this.lastCheckTime = 0; // Force immediate check
    return await this.checkConnection();
  }
}

export const connectionManager = ConnectionManager.getInstance();