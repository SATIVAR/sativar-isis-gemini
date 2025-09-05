import React, { createContext, useState, useCallback, ReactNode } from 'react';
import SimpleToastNotification from '../components/SimpleToastNotification';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const SimpleToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const SimpleToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'> & { id?: string }) => {
    const id = toast.id || crypto.randomUUID();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = React.useMemo(() => ({
    addToast,
    removeToast,
    clearToasts
  }), [addToast, removeToast, clearToasts]);

  return (
    <SimpleToastContext.Provider value={contextValue}>
      {children}
      <SimpleToastNotification toasts={toasts} removeToast={removeToast} />
    </SimpleToastContext.Provider>
  );
};

export const useSimpleToast = () => {
  const context = React.useContext(SimpleToastContext);
  if (context === undefined) {
    throw new Error('useSimpleToast must be used within a SimpleToastProvider');
  }
  return context;
};