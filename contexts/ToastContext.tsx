import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toastService } from '../services/toastService';
import ToastNotification from '../components/ToastNotification';

// Define the Toast interface locally since it's not exported from toastService
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });

    return unsubscribe;
  }, []);

  const addToast = (toast: Omit<Toast, 'id'> & { id?: string }) => {
    toastService.show(toast.type, toast.message, toast.duration);
  };

  const removeToast = (id: string) => {
    toastService.remove(id);
  };

  const clearToasts = () => {
    toastService.clear();
  };

  const contextValue: ToastContextType = React.useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    clearToasts
  }), [toasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};