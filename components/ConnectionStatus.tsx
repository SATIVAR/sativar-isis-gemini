import React, { useState, useEffect } from 'react';
import { connectionManager } from '../services/database/connectionManager';
import { fallbackManager } from '../services/database/fallbackManager';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState({
    connected: false,
    fallbackMode: false,
    lastCheck: 0,
    retryAttempts: 0
  });

  useEffect(() => {
    const updateStatus = async () => {
      await connectionManager.checkConnection();
      const connectionStatus = connectionManager.getConnectionStatus();
      setStatus(connectionStatus);
    };

    // Initial update
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleReconnect = async () => {
    await connectionManager.forceReconnect();
    const newStatus = connectionManager.getConnectionStatus();
    setStatus(newStatus);
  };

  const getStatusColor = () => {
    if (status.connected && !status.fallbackMode) {
      return 'text-green-400';
    } else if (status.fallbackMode) {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  const getStatusText = () => {
    if (status.connected && !status.fallbackMode) {
      return 'Conectado';
    } else if (status.fallbackMode) {
      return 'Modo Offline';
    } else {
      return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    if (status.connected && !status.fallbackMode) {
      return '🟢';
    } else if (status.fallbackMode) {
      return '🟡';
    } else {
      return '🔴';
    }
  };

  const getFallbackReason = () => {
    if (status.fallbackMode) {
      const reason = fallbackManager.getFallbackReason();
      switch (reason) {
        case 'network_error':
          return 'Erro de rede';
        case 'database_unavailable_on_create':
        case 'database_unavailable_on_update':
        case 'database_unavailable_on_delete':
          return 'Banco indisponível';
        case 'network_offline':
          return 'Sem conexão';
        default:
          return reason || 'Motivo desconhecido';
      }
    }
    return null;
  };

  const getQueueSize = () => {
    if (status.fallbackMode) {
      return fallbackManager.getOperationQueue().length;
    }
    return 0;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">
        {getStatusIcon()} 
        <span className={getStatusColor()}>
          {getStatusText()}
        </span>
      </span>
      
      {status.fallbackMode && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            ({getFallbackReason()})
          </span>
          {getQueueSize() > 0 && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
              {getQueueSize()} pendente(s)
            </span>
          )}
        </div>
      )}
      
      {!status.connected && (
        <button
          onClick={handleReconnect}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
          title="Tentar reconectar"
        >
          Reconectar
        </button>
      )}
      
      {status.retryAttempts > 0 && (
        <span className="text-xs text-gray-500">
          (tentativa {status.retryAttempts})
        </span>
      )}
    </div>
  );
};