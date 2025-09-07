import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../services/database/apiClient.ts';

interface ConnectionContextType {
  isOnline: boolean;
  reportOffline: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);

  const reportOffline = useCallback(() => {
    if (isOnline) {
      console.warn("A network error was detected by an API call. Forcing offline mode.");
      setIsOnline(false);
    }
  }, [isOnline]);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        await apiClient.healthCheck();
        if (isMounted && !isOnline) {
          console.log("Connection restored. Now online.");
          setIsOnline(true);
        }
      } catch (error) {
        if (isMounted && isOnline) {
          console.log("Connection lost. Now offline.");
          setIsOnline(false);
        }
      }
    };

    checkStatus(); // Initial check
    const intervalId = setInterval(checkStatus, 15000); // Check every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isOnline]);

  const value = useMemo(() => ({ isOnline, reportOffline }), [isOnline, reportOffline]);

  return React.createElement(ConnectionContext.Provider, { value }, children);
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};