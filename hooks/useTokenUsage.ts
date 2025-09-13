import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

// --- Types ---
interface TokenUsageContextType {
  totalTokensUsed: number;
  addTokens: (count: number) => void;
  resetTokens: () => void;
}

// --- Constants ---
const TOKEN_USAGE_STORAGE_KEY = 'sativar_isis_api_token_count';


// --- Context ---
const TokenUsageContext = createContext<TokenUsageContextType | undefined>(undefined);

// --- Provider ---
export const TokenUsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalTokensUsed, setTotalTokensUsed] = useState<number>(0);

  // Load initial token count from localStorage on mount
  useEffect(() => {
    try {
      const storedCount = localStorage.getItem(TOKEN_USAGE_STORAGE_KEY);
      if (storedCount) {
        setTotalTokensUsed(parseInt(storedCount, 10));
      }
    } catch (e) {
      console.error("Could not load token count from localStorage", e);
    }
  }, []);

  const addTokens = useCallback((count: number) => {
    setTotalTokensUsed(prevTotal => {
      const newTotal = prevTotal + count;
      try {
        localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, newTotal.toString());
      } catch (e) {
        console.error("Could not save token count to localStorage", e);
      }
      return newTotal;
    });
  }, []);

  const resetTokens = useCallback(() => {
    const confirmed = window.confirm("Tem certeza que deseja zerar o contador de tokens? Esta ação é útil para iniciar um novo ciclo de monitoramento.");
    if (confirmed) {
        setTotalTokensUsed(0);
        try {
            localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, '0');
        } catch (e) {
            console.error("Could not reset token count in localStorage", e);
        }
    }
  }, []);

  const value = useMemo(() => ({
    totalTokensUsed,
    addTokens,
    resetTokens,
  }), [totalTokensUsed, addTokens, resetTokens]);

  return React.createElement(TokenUsageContext.Provider, { value }, children);
};

// --- Hook ---
export const useTokenUsage = () => {
  const context = useContext(TokenUsageContext);
  if (context === undefined) {
    throw new Error('useTokenUsage must be used within a TokenUsageProvider');
  }
  return context;
};