
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ApiCall } from '../services/apiHistoryService.ts';
import { getApiHistory, addApiCall as addApiCallService, clearApiHistory as clearApiHistoryService } from '../services/apiHistoryService.ts';

interface ApiHistoryContextType {
  history: ApiCall[];
  addApiCall: (callData: Omit<ApiCall, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

const ApiHistoryContext = createContext<ApiHistoryContextType | undefined>(undefined);

export const ApiHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ApiCall[]>([]);

  useEffect(() => {
    setHistory(getApiHistory());
  }, []);

  const addApiCall = useCallback((callData: Omit<ApiCall, 'id' | 'timestamp'>) => {
    addApiCallService(callData);
    setHistory(getApiHistory()); // Re-fetch from storage to update state
  }, []);

  const clearHistory = useCallback(() => {
    clearApiHistoryService();
    setHistory([]);
  }, []);

  const value = useMemo(() => ({
    history,
    addApiCall,
    clearHistory
  }), [history, addApiCall, clearHistory]);

  return React.createElement(ApiHistoryContext.Provider, { value }, children);
};

export const useApiHistory = () => {
  const context = useContext(ApiHistoryContext);
  if (context === undefined) {
    throw new Error('useApiHistory must be used within an ApiHistoryProvider');
  }
  return context;
};