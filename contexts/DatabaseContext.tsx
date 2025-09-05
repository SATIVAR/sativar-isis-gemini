import React, { createContext, useState, useEffect, ReactNode } from 'react';
import databaseService from '../services/database';
import { fallbackManager } from '../services/database/fallbackManager';
import { syncService } from '../services/database/syncService';
import { ConnectionStatusEnum } from '../services/database/types';
import { toastService } from '../services/toastService';

interface DatabaseContextType {
  isConnected: boolean;
  isFallbackMode: boolean;
  fallbackReason: string | null;
  connectionStatus: ConnectionStatusEnum;
  retryConnection: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(databaseService.isConnected());
  const [isFallbackMode, setIsFallbackMode] = useState(fallbackManager.isInFallbackMode());
  const [fallbackReason, setFallbackReason] = useState(fallbackManager.getFallbackReason());
  const [connectionStatus, setConnectionStatus] = useState(databaseService.getConnectionStatus().status);

  useEffect(() => {
    let currentFallbackMode = isFallbackMode;
    let isCheckingConnection = false;
    
    const checkConnection = async () => {
      if (isCheckingConnection) return;
      isCheckingConnection = true;
      
      try {
        const status = databaseService.getConnectionStatus();
        const connected = databaseService.isConnected();
        
        setConnectionStatus(prev => prev !== status.status ? status.status : prev);
        setIsConnected(prev => prev !== connected ? connected : prev);
        
        // If we're in fallback mode and database is now connected, try to sync
        if (currentFallbackMode && connected) {
          try {
            const result = await syncService.syncWithDatabase();
            if (result.success) {
              setIsFallbackMode(false);
              setFallbackReason(null);
              currentFallbackMode = false;
              toastService.success("Conexão restabelecida e dados sincronizados!");
            }
          } catch (error) {
            console.error('Failed to sync with database:', error);
          }
        }
        
        // If we're not in fallback mode but database is disconnected, enable fallback
        if (!currentFallbackMode && !connected) {
          await fallbackManager.enableFallbackMode('Database connection lost');
          setIsFallbackMode(true);
          setFallbackReason(fallbackManager.getFallbackReason());
          currentFallbackMode = true;
          toastService.warning("Modo offline ativado.");
        }
      } catch (error) {
        console.error('Connection check failed:', error);
      } finally {
        isCheckingConnection = false;
      }
    };
    
    // Initial check
    checkConnection();
    
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const retryConnection = async () => {
    try {
      await databaseService.connect();
      const connected = databaseService.isConnected();
      setIsConnected(connected);
      setConnectionStatus(databaseService.getConnectionStatus().status);
      
      if (connected) {
        // Try to sync if we were in fallback mode
        if (isFallbackMode) {
          try {
            const result = await syncService.syncWithDatabase();
            if (result.success) {
              setIsFallbackMode(false);
              setFallbackReason(null);
            }
          } catch (error) {
            console.error('Failed to sync with database:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to reconnect to database:', error);
      if (!isFallbackMode) {
        await fallbackManager.enableFallbackMode('Failed to reconnect to database');
        setIsFallbackMode(true);
        setFallbackReason(fallbackManager.getFallbackReason());
      }
    }
  };

  const contextValue: DatabaseContextType = React.useMemo(() => ({
    isConnected,
    isFallbackMode,
    fallbackReason,
    connectionStatus,
    retryConnection
  }), [isConnected, isFallbackMode, fallbackReason, connectionStatus]);

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = React.useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};