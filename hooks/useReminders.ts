
import React, { createContext, useState, useContext, useEffect, useMemo, useRef } from 'react';
import type { Reminder, Task } from '../types';

const REMINDERS_KEY = 'sativar_isis_reminders';
const NOTIFIED_REMINDERS_KEY = 'sativar_isis_notified_reminders';

// Utility to get today's date in YYYY-MM-DD format
export const getTodayDateString = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); // Adjust for timezone
    return today.toISOString().split('T')[0];
};

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminderData: Omit<Reminder, 'id' | 'isCompleted' | 'tasks'> & { tasks: Omit<Task, 'id'|'isCompleted'>[] }) => void;
  updateReminder: (reminderData: Reminder) => void;
  toggleTask: (reminderId: string, taskId: string) => void;
  deleteReminder: (id: string) => void;
  clearCompletedReminders: () => void;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
  hasOverdueReminders: boolean;
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
  const initialCheckComplete = useRef(false);

  useEffect(() => {
    try {
      const storedReminders = localStorage.getItem(REMINDERS_KEY);
      if (storedReminders) {
        setReminders(JSON.parse(storedReminders));
      }
    } catch (error) {
      console.error("Failed to load reminders from localStorage", error);
    }
  }, []);
  
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const newlyOverdueReminders: Reminder[] = [];

      const currentOverdue = reminders.some(reminder => {
        if (reminder.isCompleted) return false;
        const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
        return now >= reminderDateTime;
      });
      setHasOverdueReminders(currentOverdue);

      const notifiedIds = getNotifiedIds();
      
      reminders.forEach(reminder => {
        if (reminder.isCompleted || notifiedIds.includes(reminder.id)) return;
        const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
        if (now >= reminderDateTime) {
          newlyOverdueReminders.push(reminder);
        }
      });

      if (newlyOverdueReminders.length > 0) {
        if (initialCheckComplete.current) {
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
        }
        
        const newNotifiedIds = [...new Set([...notifiedIds, ...newlyOverdueReminders.map(r => r.id)])];
        setNotifiedIds(newNotifiedIds);
      }
      
      if (!initialCheckComplete.current) {
          initialCheckComplete.current = true;
      }
    }, 15 * 1000); // Check every 15 seconds

    return () => clearInterval(intervalId);
  }, [reminders, notificationPermission]);

  const saveReminders = (newReminders: Reminder[]) => {
    try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(newReminders));
      setReminders(newReminders);
    } catch (error) {
      console.error("Failed to save reminders to localStorage", error);
    }
  };

  const addReminder = (reminderData: Omit<Reminder, 'id' | 'isCompleted' | 'tasks'> & { tasks: Omit<Task, 'id'|'isCompleted'>[] }) => {
    const newId = crypto.randomUUID();
    const newTasks: Task[] = reminderData.tasks.map(task => ({
        id: crypto.randomUUID(),
        text: task.text,
        isCompleted: false,
    }));

    const newReminder: Reminder = {
      ...reminderData,
      id: newId,
      tasks: newTasks,
      isCompleted: false,
      recurrence: reminderData.recurrence || 'none',
    };
    saveReminders([...reminders, newReminder]);
  };
  
  const updateReminder = (updatedReminder: Reminder) => {
    const newReminders = reminders.map(r => (r.id === updatedReminder.id ? updatedReminder : r));
    saveReminders(newReminders);
  };

  const toggleTask = (reminderId: string, taskId: string) => {
    const newReminders = reminders.map(r => {
        if (r.id !== reminderId) return r;
        
        const newTasks = r.tasks.map(t => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        
        const allTasksCompleted = newTasks.every(t => t.isCompleted);
        
        return { ...r, tasks: newTasks, isCompleted: allTasksCompleted };
    });
    saveReminders(newReminders);
  };

  const deleteReminder = (id: string) => {
    const newReminders = reminders.filter(r => r.id !== id);
    saveReminders(newReminders);
  };

  const clearCompletedReminders = () => {
    const newReminders = reminders.filter(r => !r.isCompleted);
    saveReminders(newReminders);
  };
  
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações de desktop.');
      return;
    }
    try {
        sessionStorage.removeItem(NOTIFIED_REMINDERS_KEY);
    } catch(e) {
        console.error("Could not access sessionStorage to remove notified IDs", e);
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const value = useMemo(() => ({ reminders, addReminder, updateReminder, toggleTask, deleteReminder, clearCompletedReminders, notificationPermission, requestNotificationPermission, hasOverdueReminders }), [reminders, notificationPermission, hasOverdueReminders]);

  return React.createElement(RemindersContext.Provider, { value }, children);
};

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
};
