import React, { createContext, useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Reminder, Task } from '../types';
import { dataPreservationLayer } from '../services/database/dataPreservationLayer';
import { notificationEngine } from '../services/database/NotificationEngine';
import { notificationRepository } from '../services/database/repositories/NotificationRepository';
import { useToast } from '../contexts/ToastContext';
const NOTIFIED_REMINDERS_KEY = 'sativar_isis_notified_reminders';

// Utility to get today's date in YYYY-MM-DD format
export const getTodayDateString = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); // Adjust for timezone
  return today.toISOString().split('T')[0];
};

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
  isSyncing: boolean;
  syncReminders: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

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

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [hasOverdueReminders, setHasOverdueReminders] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  const initialCheckComplete = useRef(false);
  const remindersRef = useRef<Reminder[]>([]);
  const addToastRef = useRef(addToast);

  // Keep addToast ref updated
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const all = await dataPreservationLayer.getAllReminders();
        setReminders(all);
        remindersRef.current = all;
      } catch (error) {
        console.error("Failed to load reminders via DPL:", error);
        addToastRef.current({
          type: 'error',
          message: "Falha ao carregar lembretes. Usando modo offline."
        });
      } finally {
        setIsLoaded(true);
      }
    };

    loadReminders();
  }, []);
  
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Update ref when reminders change
  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  // Checagem de overdue/reminders separada do carregamento inicial para evitar loop
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      notificationEngine.start();
    } catch {}
    
    // Função de checagem
    const checkOverdue = async () => {
      try {
        const now = new Date();
        const currentReminders = remindersRef.current;
        
        const currentOverdue = currentReminders.some((reminder: Reminder) => {
          if (reminder.isCompleted) return false;
          const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
          return now >= reminderDateTime;
        });
        
        setHasOverdueReminders(currentOverdue);

        if (initialCheckComplete.current) {
          const notifiedIds = getNotifiedIds();
          const newlyOverdueReminders: Reminder[] = [];
          
          currentReminders.forEach((reminder: Reminder) => {
            if (reminder.isCompleted || notifiedIds.includes(reminder.id)) return;
            const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
            if (now >= reminderDateTime) {
              newlyOverdueReminders.push(reminder);
            }
          });

          if (newlyOverdueReminders.length > 0) {
            const checks = await Promise.all(newlyOverdueReminders.map((r: Reminder) => notificationRepository.hasNotification(r.id, 'due')));
            const toNotifyNow = newlyOverdueReminders.filter((_, idx) => !checks[idx]);

            for (const r of toNotifyNow) {
              await notificationRepository.logNotification(r.id, 'due', 'sent');
            }

            if (toNotifyNow.length > 0) {
              playAlertSound();
              if (notificationPermission === 'granted') {
                const firstReminder = toNotifyNow[0];
                const body = toNotifyNow.length > 1 
                  ? `${firstReminder.title}\nE mais ${toNotifyNow.length - 1} tarefa(s) pendente(s).`
                  : firstReminder.title;

                const notification = new Notification('SATIVAR - Isis: Tarefa Pendente', {
                  body: body,
                  tag: 'sativar-reminder',
                });
                notification.onclick = () => window.parent.focus();
              }
            }

            const idsNotified = newlyOverdueReminders.map((r: Reminder) => r.id);
            const newNotifiedIds = [...new Set([...notifiedIds, ...idsNotified])];
            setNotifiedIds(newNotifiedIds);
          }
        }
        
        if (!initialCheckComplete.current) {
          initialCheckComplete.current = true;
        }
      } catch (error) {
        console.error('Error in checkOverdue:', error);
      }
    };

    const intervalId = setInterval(checkOverdue, 30000); // Check every 30 seconds
    checkOverdue();
    return () => clearInterval(intervalId);
  }, [isLoaded, notificationPermission]);



  const syncReminders = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await dataPreservationLayer.sync();
      if (result.success) {
        // Reload reminders after successful sync
        const all = await dataPreservationLayer.getAllReminders();
        setReminders(all);
        remindersRef.current = all;
        addToastRef.current({
          type: 'success',
          message: result.message
        });
      } else {
        addToastRef.current({
          type: 'warning',
          message: result.message
        });
      }
      
      if (result.conflicts && result.conflicts.length > 0) {
        addToastRef.current({
          type: 'warning',
          message: `Foram detectados ${result.conflicts.length} conflitos durante a sincronização.`
        });
      }
    } catch (error) {
      console.error("Failed to sync reminders:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao sincronizar lembretes. Tente novamente."
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'isCompleted' | 'tasks'> & { tasks: Omit<Task, 'id'|'isCompleted'>[] }) => {
    try {
      const payload: any = {
        ...reminderData,
        tasks: reminderData.tasks.map((t: Omit<Task, 'id'|'isCompleted'>) => ({ text: t.text }))
      };
      const created = await dataPreservationLayer.createReminder(payload);
      setReminders(prev => {
        const newReminders = [...prev, created];
        remindersRef.current = newReminders;
        return newReminders;
      });
      addToastRef.current({
        type: 'success',
        message: "Lembrete criado com sucesso!"
      });
    } catch (error) {
      console.error("Failed to add reminder via DPL:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao criar lembrete. Tente novamente."
      });
      throw error;
    }
  }, []);
  
  const updateReminder = useCallback(async (updatedReminder: Reminder) => {
    try {
      const result = await dataPreservationLayer.updateReminder(updatedReminder as any);
      setReminders(prev => {
        const newReminders = prev.map((r: Reminder) => (r.id === result.id ? result : r));
        remindersRef.current = newReminders;
        return newReminders;
      });
      addToastRef.current({
        type: 'success',
        message: "Lembrete atualizado com sucesso!"
      });
    } catch (error) {
      console.error("Failed to update reminder via DPL:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao atualizar lembrete. Tente novamente."
      });
      throw error;
    }
  }, []);

  const toggleTask = useCallback(async (reminderId: string, taskId: string) => {
    try {
      // Use the data preservation layer to toggle the task
      // First, get the current reminder
      const reminder = remindersRef.current.find(r => r.id === reminderId);
      if (!reminder) return;

      // Find the task to toggle
      const task = reminder.tasks.find(t => t.id === taskId);
      if (!task) return;

      // Update the task status
      const updatedTask = { ...task, isCompleted: !task.isCompleted };
      const updatedTasks = reminder.tasks.map((t: Task) => (t.id === taskId ? updatedTask : t));
      
      // Check if all tasks are completed
      const allTasksCompleted = updatedTasks.every((t: Task) => t.isCompleted);
      
      // Update the reminder with the new task status
      const updatedReminder = { 
        ...reminder, 
        tasks: updatedTasks, 
        isCompleted: allTasksCompleted 
      };

      // Update through the data preservation layer
      const result = await dataPreservationLayer.updateReminder(updatedReminder);
      
      // Update local state
      setReminders(prev => {
        const newReminders = prev.map((r: Reminder) => (r.id === reminderId ? result : r));
        remindersRef.current = newReminders;
        return newReminders;
      });
    } catch (error) {
      console.error("Failed to toggle task via DPL:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao atualizar tarefa. Tente novamente."
      });
      throw error;
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await dataPreservationLayer.deleteReminder(id);
      setReminders(prev => {
        const newReminders = prev.filter((r: Reminder) => r.id !== id);
        remindersRef.current = newReminders;
        return newReminders;
      });
      addToastRef.current({
        type: 'success',
        message: "Lembrete excluído com sucesso!"
      });
    } catch (error) {
      console.error("Failed to delete reminder via DPL:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao excluir lembrete. Tente novamente."
      });
      throw error;
    }
  }, []);

  const clearCompletedReminders = useCallback(async () => {
    try {
      const completedReminders = remindersRef.current.filter((r: Reminder) => r.isCompleted);
      await Promise.all(completedReminders.map((r: Reminder) => dataPreservationLayer.deleteReminder(r.id)));
      setReminders(prev => {
        const newReminders = prev.filter((r: Reminder) => !r.isCompleted);
        remindersRef.current = newReminders;
        return newReminders;
      });
      addToastRef.current({
        type: 'success',
        message: "Lembretes concluídos limpos com sucesso!"
      });
    } catch (error) {
      console.error("Failed to clear completed reminders via DPL:", error);
      addToastRef.current({
        type: 'error',
        message: "Falha ao limpar lembretes concluídos. Tente novamente."
      });
      throw error;
    }
  }, []);
  
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      addToastRef.current({
        type: 'error',
        message: "Este navegador não suporta notificações de desktop."
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
      addToastRef.current({
        type: 'success',
        message: "Permissão de notificações concedida!"
      });
    } else {
      addToastRef.current({
        type: 'warning',
        message: "Permissão de notificações negada. Você não receberá alertas."
      });
    }
  }, []);

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
    isSyncing,
    syncReminders
  }), [reminders, notificationPermission, hasOverdueReminders, isLoaded, isSyncing, syncReminders, addReminder, updateReminder, toggleTask, deleteReminder, clearCompletedReminders, requestNotificationPermission]);

  return React.createElement(RemindersContext.Provider, { value }, children);
};

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
};