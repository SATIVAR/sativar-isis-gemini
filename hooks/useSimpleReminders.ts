import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import type { Reminder, Task } from '../types';
import { simpleApiClient } from '../services/simpleApiClient';
import { useSimpleToast } from '../contexts/SimpleToastContext';

// Utility to get today's date in YYYY-MM-DD format
export const getTodayDateString = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split('T')[0];
};

// LocalStorage keys
const REMINDERS_STORAGE_KEY = 'sativar_isis_reminders';
const NOTIFIED_REMINDERS_KEY = 'sativar_isis_notified_reminders';

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminderData: Omit<Reminder, 'id' | 'isCompleted' | 'tasks'> & { tasks: Omit<Task, 'id'|'isCompleted'>[] }) => Promise<void>;
  updateReminder: (reminderData: Reminder) => Promise<void>;
  toggleTask: (reminderId: string, taskId: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  clearCompletedReminders: () => Promise<void>;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
  hasOverdueReminders: boolean;
  isLoaded: boolean;
  isOnline: boolean;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

// Helper functions for localStorage
const saveToLocalStorage = (reminders: Reminder[]) => {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Failed to save reminders to localStorage:', error);
  }
};

const loadFromLocalStorage = (): Reminder[] => {
  try {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load reminders from localStorage:', error);
    return [];
  }
};

const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.error("Could not play sound", e);
  }
};

const getNotifiedIds = (): string[] => {
  try {
    const item = sessionStorage.getItem(NOTIFIED_REMINDERS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Could not access sessionStorage for notified IDs", e);
    return [];
  }
};

const setNotifiedIds = (ids: string[]) => {
  try {
    sessionStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Could not access sessionStorage to set notified IDs", e);
  }
};

export const SimpleRemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [hasOverdueReminders, setHasOverdueReminders] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { addToast } = useSimpleToast();

  // Load reminders on mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        // Try to load from API first
        const apiReminders = await simpleApiClient.getReminders();
        if (apiReminders.length > 0) {
          setReminders(apiReminders);
          setIsOnline(true);
          // Save to localStorage as backup
          saveToLocalStorage(apiReminders);
        } else {
          // Fallback to localStorage
          const localReminders = loadFromLocalStorage();
          setReminders(localReminders);
          setIsOnline(false);
          if (localReminders.length > 0) {
            addToast({
              type: 'warning',
              message: 'Usando dados offline. Conecte-se para sincronizar.'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load reminders:', error);
        // Fallback to localStorage
        const localReminders = loadFromLocalStorage();
        setReminders(localReminders);
        setIsOnline(false);
        addToast({
          type: 'error',
          message: 'Falha ao conectar. Usando modo offline.'
        });
      } finally {
        setIsLoaded(true);
      }
    };

    loadReminders();
  }, [addToast]);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Check for overdue reminders
  useEffect(() => {
    if (!isLoaded) return;

    const checkOverdue = () => {
      const now = new Date();
      const notifiedIds = getNotifiedIds();
      const newlyOverdueReminders: Reminder[] = [];
      
      let hasOverdue = false;
      
      reminders.forEach((reminder: Reminder) => {
        if (reminder.isCompleted) return;
        
        const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
        const isOverdue = now >= reminderDateTime;
        
        if (isOverdue) {
          hasOverdue = true;
          if (!notifiedIds.includes(reminder.id)) {
            newlyOverdueReminders.push(reminder);
          }
        }
      });

      setHasOverdueReminders(hasOverdue);

      // Notify about newly overdue reminders
      if (newlyOverdueReminders.length > 0) {
        playAlertSound();
        
        if (notificationPermission === 'granted') {
          const firstReminder = newlyOverdueReminders[0];
          const body = newlyOverdueReminders.length > 1 
            ? `${firstReminder.title}\nE mais ${newlyOverdueReminders.length - 1} tarefa(s) pendente(s).`
            : firstReminder.title;

          const notification = new Notification('SATIVAR - Isis: Tarefa Pendente', {
            body: body,
            tag: 'sativar-reminder',
          });
          notification.onclick = () => window.parent.focus();
        }

        // Mark as notified
        const idsNotified = newlyOverdueReminders.map((r: Reminder) => r.id);
        const newNotifiedIds = [...new Set([...notifiedIds, ...idsNotified])];
        setNotifiedIds(newNotifiedIds);
      }
    };

    const intervalId = setInterval(checkOverdue, 30000); // Check every 30 seconds
    checkOverdue(); // Initial check
    
    return () => clearInterval(intervalId);
  }, [isLoaded, reminders, notificationPermission]);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'isCompleted' | 'tasks'> & { tasks: Omit<Task, 'id'|'isCompleted'>[] }) => {
    try {
      const id = crypto.randomUUID();
      const tasks = reminderData.tasks.map(task => ({
        id: crypto.randomUUID(),
        text: task.text,
        isCompleted: false
      }));

      const newReminder: Reminder = {
        ...reminderData,
        id,
        isCompleted: false,
        tasks
      };

      // Try to save to API
      const apiResult = await simpleApiClient.createReminder(newReminder);
      if (apiResult) {
        setReminders(prev => [...prev, apiResult]);
        saveToLocalStorage([...reminders, apiResult]);
        setIsOnline(true);
        addToast({
          type: 'success',
          message: 'Lembrete criado com sucesso!'
        });
      } else {
        // Fallback to localStorage
        setReminders(prev => [...prev, newReminder]);
        saveToLocalStorage([...reminders, newReminder]);
        setIsOnline(false);
        addToast({
          type: 'warning',
          message: 'Lembrete salvo offline. Sincronize quando possível.'
        });
      }
    } catch (error) {
      console.error('Failed to add reminder:', error);
      addToast({
        type: 'error',
        message: 'Falha ao criar lembrete.'
      });
      throw error;
    }
  }, [reminders, addToast]);

  const updateReminder = useCallback(async (updatedReminder: Reminder) => {
    try {
      // Try to update via API
      const apiResult = await simpleApiClient.updateReminder(updatedReminder.id, updatedReminder);
      if (apiResult) {
        setReminders(prev => prev.map(r => r.id === updatedReminder.id ? apiResult : r));
        saveToLocalStorage(reminders.map(r => r.id === updatedReminder.id ? apiResult : r));
        setIsOnline(true);
        addToast({
          type: 'success',
          message: 'Lembrete atualizado com sucesso!'
        });
      } else {
        // Fallback to localStorage
        setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
        saveToLocalStorage(reminders.map(r => r.id === updatedReminder.id ? updatedReminder : r));
        setIsOnline(false);
        addToast({
          type: 'warning',
          message: 'Lembrete atualizado offline.'
        });
      }
    } catch (error) {
      console.error('Failed to update reminder:', error);
      addToast({
        type: 'error',
        message: 'Falha ao atualizar lembrete.'
      });
      throw error;
    }
  }, [reminders, addToast]);

  const toggleTask = useCallback(async (reminderId: string, taskId: string) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      const task = reminder.tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = { ...task, isCompleted: !task.isCompleted };
      const updatedTasks = reminder.tasks.map(t => t.id === taskId ? updatedTask : t);
      const allTasksCompleted = updatedTasks.every(t => t.isCompleted);
      
      const updatedReminder = { 
        ...reminder, 
        tasks: updatedTasks, 
        isCompleted: allTasksCompleted 
      };

      await updateReminder(updatedReminder);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      addToast({
        type: 'error',
        message: 'Falha ao atualizar tarefa.'
      });
      throw error;
    }
  }, [reminders, updateReminder, addToast]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      // Try to delete via API
      const success = await simpleApiClient.deleteReminder(id);
      if (success) {
        setReminders(prev => prev.filter(r => r.id !== id));
        saveToLocalStorage(reminders.filter(r => r.id !== id));
        setIsOnline(true);
        addToast({
          type: 'success',
          message: 'Lembrete excluído com sucesso!'
        });
      } else {
        // Fallback to localStorage
        setReminders(prev => prev.filter(r => r.id !== id));
        saveToLocalStorage(reminders.filter(r => r.id !== id));
        setIsOnline(false);
        addToast({
          type: 'warning',
          message: 'Lembrete excluído offline.'
        });
      }
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      addToast({
        type: 'error',
        message: 'Falha ao excluir lembrete.'
      });
      throw error;
    }
  }, [reminders, addToast]);

  const clearCompletedReminders = useCallback(async () => {
    try {
      const completedReminders = reminders.filter(r => r.isCompleted);
      const promises = completedReminders.map(r => simpleApiClient.deleteReminder(r.id));
      await Promise.all(promises);
      
      setReminders(prev => prev.filter(r => !r.isCompleted));
      saveToLocalStorage(reminders.filter(r => !r.isCompleted));
      
      addToast({
        type: 'success',
        message: 'Lembretes concluídos limpos com sucesso!'
      });
    } catch (error) {
      console.error('Failed to clear completed reminders:', error);
      addToast({
        type: 'error',
        message: 'Falha ao limpar lembretes concluídos.'
      });
      throw error;
    }
  }, [reminders, addToast]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      addToast({
        type: 'error',
        message: 'Este navegador não suporta notificações de desktop.'
      });
      return;
    }
    
    try {
      sessionStorage.removeItem(NOTIFIED_REMINDERS_KEY);
    } catch(e) {
      console.error("Could not access sessionStorage to remove notified IDs", e);
    }
    
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      addToast({
        type: 'success',
        message: 'Permissão de notificações concedida!'
      });
    } else {
      addToast({
        type: 'warning',
        message: 'Permissão de notificações negada.'
      });
    }
  }, [addToast]);

  const value = useMemo(() => ({ 
    reminders, 
    addReminder, 
    updateReminder, 
    toggleTask, 
    deleteReminder, 
    clearCompletedReminders, 
    notificationPermission, 
    requestNotificationPermission, 
    hasOverdueReminders,
    isLoaded,
    isOnline
  }), [
    reminders, 
    addReminder, 
    updateReminder, 
    toggleTask, 
    deleteReminder, 
    clearCompletedReminders, 
    requestNotificationPermission, 
    notificationPermission, 
    hasOverdueReminders,
    isLoaded,
    isOnline
  ]);

  return React.createElement(RemindersContext.Provider, { value }, children);
};

export const useSimpleReminders = () => {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useSimpleReminders must be used within a SimpleRemindersProvider');
  }
  return context;
};