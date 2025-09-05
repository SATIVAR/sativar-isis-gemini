import React, { useState, useEffect } from 'react';
import databaseService from '../services/database';
import { fallbackManager } from '../services/database/fallbackManager';
import { ConnectionStatusEnum } from '../services/database/types';
import { toastService } from '../services/toastService';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  showDetails = false 
}) => {
  const [status, setStatus] = useState(databaseService.getConnectionStatus());
  const [isFallbackMode, setIsFallbackMode] = useState(fallbackManager.isInFallbackMode());
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      // Test database connectivity
      try {
        await databaseService.connect();
      } catch (error) {
        console.warn('Connection test failed:', error);
      }
      
      const currentStatus = databaseService.getConnectionStatus();
      setStatus(currentStatus);
      setIsFallbackMode(fallbackManager.isInFallbackMode());
      
      // Test connection latency if connected
      if (currentStatus.status === ConnectionStatusEnum.Connected) {
        try {
          const start = Date.now();
          await fetch('/api/db/status');
          const end = Date.now();
          setLatency(end - start);
        } catch (error) {
          setLatency(null);
        }
      } else {
        setLatency(null);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Show toast notifications for connection status changes
  useEffect(() => {
    if (isFallbackMode) {
      toastService.show('warning', 'Modo offline ativado. As operações serão sincronizadas quando a conexão for restaurada.', 10000);
    } else if (status.status === ConnectionStatusEnum.Connected) {
      toastService.show('success', 'Conexão com o banco de dados restaurada.', 5000);
    } else if (status.status === ConnectionStatusEnum.Disconnected) {
      toastService.show('error', 'Conexão com o banco de dados perdida. Modo offline ativado.', 10000);
    }
  }, [isFallbackMode, status.status]);

  const getStatusColor = () => {
    if (isFallbackMode) {
      return 'bg-yellow-500';
    }
    switch (status.status) {
      case ConnectionStatusEnum.Connected:
        return 'bg-green-500';
      case ConnectionStatusEnum.Connecting:
        return 'bg-yellow-500';
      case ConnectionStatusEnum.Disconnected:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (isFallbackMode) {
      return 'Modo Offline';
    }
    switch (status.status) {
      case ConnectionStatusEnum.Connected:
        return 'Conectado';
      case ConnectionStatusEnum.Connecting:
        return 'Conectando...';
      case ConnectionStatusEnum.Disconnected:
        return 'Desconectado';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
      <span className="text-sm font-medium text-gray-700">
        {getStatusText()}
      </span>
      {showDetails && latency !== null && (
        <span className="text-xs text-gray-500">
          ({latency}ms)
        </span>
      )}
      {isFallbackMode && (
        <span className="text-xs text-yellow-600 font-medium">
          (Offline)
        </span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;