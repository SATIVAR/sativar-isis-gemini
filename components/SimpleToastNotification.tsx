import React, { useState, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const SimpleToastNotification: React.FC<ToastNotificationProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  removeToast: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, removeToast }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  }, [toast.id, removeToast]);

  // Auto-close timer - only set once
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, handleClose]); // Only depend on toast.id and duration

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500 text-white border border-green-600';
      case 'error':
        return 'bg-red-500 text-white border border-red-600';
      case 'warning':
        return 'bg-yellow-500 text-gray-800 border border-yellow-600';
      case 'info':
        return 'bg-blue-500 text-white border border-blue-600';
      default:
        return 'bg-gray-500 text-white border border-gray-600';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`flex items-center p-4 rounded-lg shadow-lg transition-all duration-300 ${
        getTypeStyles()
      } ${isLeaving ? 'opacity-0 transform translate-x-full' : 'opacity-100'}`}
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button 
        onClick={handleClose}
        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default SimpleToastNotification;