import React, { useEffect, useState } from 'react';
import { fallbackManager } from '../services/database/fallbackManager';
import { useToast } from '../contexts/ToastContext';

interface ConnectionErrorHandlerProps {
  children: React.ReactNode;
}

const ConnectionErrorHandler: React.FC<ConnectionErrorHandlerProps> = ({ children }) => {
  const [isInFallbackMode, setIsInFallbackMode] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/db/status');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.connected) {
            if (isInFallbackMode) {
              await fallbackManager.disableFallbackMode();
              setIsInFallbackMode(false);
              setConnectionAttempts(0);
            }
            return;
          }
        }
        
        // Connection failed
        if (!isInFallbackMode) {
          await fallbackManager.enableFallbackMode('api_connection_failed');
          setIsInFallbackMode(true);
        }
        
        setConnectionAttempts(prev => {
          const newCount = prev + 1;
          // Show connection error after multiple attempts
          if (newCount > 3 && newCount % 5 === 0) {
            addToast({
              type: 'warning',
              message: `Tentativa de reconexão ${newCount}. Usando modo offline.`
            });
          }
          return newCount;
        });
      } catch (error) {
        if (!isInFallbackMode) {
          await fallbackManager.enableFallbackMode('network_error');
          setIsInFallbackMode(true);
        }
        setConnectionAttempts(prev => prev + 1);
      }
    };

    // Initial check
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
};

export default ConnectionErrorHandler;