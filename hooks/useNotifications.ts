
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

// --- Types ---
type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

interface NotificationContextType {
  permission: NotificationPermissionStatus;
  isEnabled: boolean;
  requestPermission: () => Promise<void>;
  toggleIsEnabled: (enabled: boolean) => void;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

// --- Constants ---
const NOTIFICATIONS_ENABLED_KEY = 'sativar_isis_notifications_enabled';


// --- Context ---
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// --- Provider ---
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  // Check initial permission status and user preference on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      const storedPreference = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      setIsEnabled(storedPreference === 'true');
    } else {
        console.warn("This browser does not support desktop notification");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    
    const status = await Notification.requestPermission();
    setPermission(status);
    // If permission is granted, enable notifications by default for the user
    if (status === 'granted') {
      setIsEnabled(true);
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
    }
  }, []);

  const toggleIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && isEnabled && 'Notification' in window) {
      const notification = new Notification(title, options);
      // Optional: handle notification click
      notification.onclick = () => {
        window.focus(); // Focus the app tab when notification is clicked
      };
    }
  }, [permission, isEnabled]);

  const value = useMemo(() => ({
    permission,
    isEnabled,
    requestPermission,
    toggleIsEnabled,
    showNotification,
  }), [permission, isEnabled, requestPermission, toggleIsEnabled, showNotification]);

  return React.createElement(NotificationContext.Provider, { value }, children);
};

// --- Hook ---
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};