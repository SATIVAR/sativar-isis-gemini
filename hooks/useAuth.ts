import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { User, UserRole } from '../types.ts';
import { apiClient } from '../services/database/apiClient.ts';

const SESSION_STORAGE_KEY = 'sativar_isis_user_session';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdminSetup: boolean;
  isLoading: boolean;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  registerAdmin: (name: string, password: string, whatsapp?: string) => Promise<void>;
  checkSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminSetup, setIsAdminSetup] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check session storage on initial load
    try {
      const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    // Check admin setup status after checking local session
    checkSetup();
  }, []);

  const checkSetup = useCallback(async () => {
    setIsLoading(true);
    try {
      const { isAdminSetup } = await apiClient.get<{ isAdminSetup: boolean }>('/auth/setup-status');
      setIsAdminSetup(isAdminSetup);
    } catch (error) {
      console.error("Failed to check admin setup status", error);
      // Assume setup is done if API fails, to avoid locking out users
      setIsAdminSetup(true); 
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const login = useCallback(async (username: string, password: string) => {
    try {
        const loggedInUser = await apiClient.post<User>('/auth/login', { username, password });
        setUser(loggedInUser);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loggedInUser));
    } catch (error) {
        console.error("Login failed:", error);
        // Rethrow to be caught by the component
        throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const registerAdmin = useCallback(async (name: string, password: string, whatsapp?: string) => {
    try {
        await apiClient.post('/auth/register-admin', { name, password, whatsapp });
        // After successful registration, update the setup status
        await checkSetup();
    } catch (error) {
        console.error("Admin registration failed:", error);
        throw error;
    }
  }, [checkSetup]);

  const value = useMemo(() => ({
    isAuthenticated: !!user,
    user,
    isAdminSetup,
    isLoading,
    login,
    logout,
    registerAdmin,
    checkSetup
  }), [user, isAdminSetup, isLoading, login, logout, registerAdmin, checkSetup]);

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
