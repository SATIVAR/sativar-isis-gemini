
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { Reminder } from '../types.ts';
import { useConnection } from './useConnection.ts';
import { RepositoryFactory } from '../services/database/RepositoryFactory.ts';
import type { IRemindersRepository } from '../services/database/repositories/interfaces.ts';

// --- Constants ---
const LOCAL_REMINDERS_KEY = 'sativar_isis_reminders';
const REMINDERS_SYNC_QUEUE_KEY = 'sativar_isis_reminders_sync_queue';

// --- Types ---
type SyncAction =
  | { type: 'add'; payload: Reminder }
  | { type: 'update'; payload: Reminder }
  | { type: 'delete'; payload: string };

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'isCompleted'>) => Promise<void>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminderCompletion: (id: string) => Promise<void>;
  hasOverdueReminders: boolean;
  isSyncingReminders: boolean;
  remindersSyncQueueCount: number;
  forceSyncReminders: () => Promise<void>;
}

// --- Helper Functions ---
const getSyncQueue = (): SyncAction[] => {
  try {
    const queue = localStorage.getItem(REMINDERS_SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

const setSyncQueue = (queue: SyncAction[]) => {
  localStorage.setItem(REMINDERS_SYNC_QUEUE_KEY, JSON.stringify(queue));
};

const addToSyncQueue = (action: SyncAction) => {
  const queue = getSyncQueue();
  // More complex logic could be added here to merge actions, e.g., an 'add' then 'update' could become just an 'add'.
  queue.push(action);
  setSyncQueue(queue);
};


// --- Context ---
const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

// --- Provider ---
export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, reportOffline } = useConnection();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isSyncingReminders, setIsSyncingReminders] = useState(false);
  const [remindersSyncQueueCount, setRemindersSyncQueueCount] = useState(0);

  const apiRepo = useMemo(() => RepositoryFactory.getApiRemindersRepository(), []);
  const localRepo = useMemo(() => RepositoryFactory.getLocalRemindersRepository(), []);

  // Sync process
  const processSync = useCallback(async () => {
    const queue = getSyncQueue();
    if (!isOnline || isSyncingReminders || queue.length === 0) {
      return;
    }

    setIsSyncingReminders(true);
    setRemindersSyncQueueCount(queue.length);

    console.log(`Starting sync of ${queue.length} reminder actions...`);

    try {
      for (const action of queue) {
        switch (action.type) {
          case 'add':
            await apiRepo.addReminder(action.payload);
            break;
          case 'update':
            await apiRepo.updateReminder(action.payload);
            break;
          case 'delete':
            await apiRepo.deleteReminder(action.payload);
            break;
        }
      }

      // Clear the queue on success
      setSyncQueue([]);
      console.log("Sync successful. Re-fetching definitive state from server.");
      
      // Re-fetch all data from server to ensure consistency
      const serverReminders = await apiRepo.getAllReminders();
      setReminders(serverReminders);
      await localRepo.saveAllReminders(serverReminders); // Update local cache

    } catch (error) {
      console.error("Failed to sync reminders:", error);
      if (error instanceof Error && error.message.toLowerCase().includes('network error')) {
        reportOffline();
      }
      // We don't clear the queue, so it will be retried later.
    } finally {
      setIsSyncingReminders(false);
      setRemindersSyncQueueCount(getSyncQueue().length);
    }
  }, [isOnline, isSyncingReminders, apiRepo, localRepo, reportOffline]);

  // Effect to trigger sync when coming online
  useEffect(() => {
    if (isOnline) {
      processSync();
    }
  }, [isOnline, processSync]);
  
  // Load initial data on mount or when coming back online
  useEffect(() => {
    const loadData = async () => {
      let initialReminders: Reminder[] = [];
      try {
        if (isOnline) {
          initialReminders = await apiRepo.getAllReminders();
          await localRepo.saveAllReminders(initialReminders); // Cache fresh data
        } else {
          initialReminders = await localRepo.getAllReminders();
        }
      } catch (error) {
          console.warn("Could not fetch from API, falling back to local storage.", error);
          if (error instanceof Error && error.message.toLowerCase().includes('network error')) {
              reportOffline();
          }
          initialReminders = await localRepo.getAllReminders();
      }
      
      // OPTIMIZATION: Clean up old, completed reminders from the cache.
      // Reminders completed more than 15 days ago are considered "old".
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const uncleanedSize = initialReminders.length;
      const cleanedReminders = initialReminders.filter(r => {
          if (r.isCompleted) {
              return new Date(r.dueDate) >= fifteenDaysAgo;
          }
          return true; // Keep all pending reminders
      });

      if (cleanedReminders.length < uncleanedSize) {
          console.log(`Optimization: Removed ${uncleanedSize - cleanedReminders.length} old completed reminders from local cache.`);
          await localRepo.saveAllReminders(cleanedReminders);
      }

      setReminders(cleanedReminders);
      setRemindersSyncQueueCount(getSyncQueue().length);
    };
    loadData();
  }, [isOnline, apiRepo, localRepo, reportOffline]);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'isCompleted'>) => {
    const newReminder: Reminder = {
      priority: 'medium', // Default priority
      ...reminderData,
      id: crypto.randomUUID(),
      isCompleted: false,
    };

    // Optimistic update
    setReminders(prev => [...prev, newReminder]);
    await localRepo.addReminder(newReminder);
    
    if (isOnline) {
      try {
        await apiRepo.addReminder(newReminder);
      } catch (error) {
        console.error("Failed to add reminder to API. Queuing for sync.", error);
        addToSyncQueue({ type: 'add', payload: newReminder });
         if (error instanceof Error && error.message.toLowerCase().includes('network error')) {
            reportOffline();
        }
      }
    } else {
      addToSyncQueue({ type: 'add', payload: newReminder });
    }
    setRemindersSyncQueueCount(getSyncQueue().length);
  }, [isOnline, apiRepo, localRepo, reportOffline]);

  const updateReminder = useCallback(async (updatedReminder: Reminder) => {
    // Optimistic update
    setReminders(prev => prev.map(r => (r.id === updatedReminder.id ? updatedReminder : r)));
    await localRepo.updateReminder(updatedReminder);

    if (isOnline) {
      try {
        await apiRepo.updateReminder(updatedReminder);
      } catch (error) {
        console.error("Failed to update reminder to API. Queuing for sync.", error);
        addToSyncQueue({ type: 'update', payload: updatedReminder });
         if (error instanceof Error && error.message.toLowerCase().includes('network error')) {
            reportOffline();
        }
      }
    } else {
      addToSyncQueue({ type: 'update', payload: updatedReminder });
    }
    setRemindersSyncQueueCount(getSyncQueue().length);
  }, [isOnline, apiRepo, localRepo, reportOffline]);

  const deleteReminder = useCallback(async (id: string) => {
    // Optimistic update
    setReminders(prev => prev.filter(r => r.id !== id));
    await localRepo.deleteReminder(id);

    if (isOnline) {
      try {
        await apiRepo.deleteReminder(id);
      } catch (error) {
        console.error("Failed to delete reminder from API. Queuing for sync.", error);
        addToSyncQueue({ type: 'delete', payload: id });
         if (error instanceof Error && error.message.toLowerCase().includes('network error')) {
            reportOffline();
        }
      }
    } else {
      addToSyncQueue({ type: 'delete', payload: id });
    }
    setRemindersSyncQueueCount(getSyncQueue().length);
  }, [isOnline, apiRepo, localRepo, reportOffline]);
  
  const toggleReminderCompletion = useCallback(async (id: string) => {
    const reminderToToggle = reminders.find(r => r.id === id);
    if (!reminderToToggle) return;

    // This is an update operation
    const updatedReminder = { ...reminderToToggle, isCompleted: !reminderToToggle.isCompleted };
    await updateReminder(updatedReminder);

    // If a recurring reminder is marked as COMPLETE, we need to create a new one.
    if (!reminderToToggle.isCompleted && reminderToToggle.recurrence !== 'none') {
        const currentDueDate = new Date(reminderToToggle.dueDate);
        const nextDueDate = new Date(currentDueDate);
        
        switch (reminderToToggle.recurrence) {
            case 'daily': nextDueDate.setDate(currentDueDate.getDate() + 1); break;
            case 'weekly': nextDueDate.setDate(currentDueDate.getDate() + 7); break;
            case 'monthly': nextDueDate.setMonth(currentDueDate.getMonth() + 1); break;
        }

        const now = new Date();
        if (nextDueDate < now) {
            // Fast-forward to the next valid date from today
            nextDueDate.setDate(now.getDate());
            nextDueDate.setMonth(now.getMonth());
            nextDueDate.setFullYear(now.getFullYear());
             switch (reminderToToggle.recurrence) {
                case 'daily': nextDueDate.setDate(now.getDate() + 1); break;
                case 'weekly': nextDueDate.setDate(now.getDate() + 7); break;
                case 'monthly': nextDueDate.setMonth(now.getMonth() + 1); break;
            }
            nextDueDate.setHours(currentDueDate.getHours(), currentDueDate.getMinutes(), currentDueDate.getSeconds());
        }

        const { id: oldId, isCompleted: oldIsCompleted, ...restOfReminder } = reminderToToggle;

        await addReminder({
            ...restOfReminder,
            dueDate: nextDueDate.toISOString(),
        });
    }
}, [reminders, updateReminder, addReminder]);

  const hasOverdueReminders = useMemo(() => {
    const now = new Date();
    return reminders.some(r => !r.isCompleted && new Date(r.dueDate) < now);
  }, [reminders]);

  const forceSyncReminders = useCallback(async () => {
    await processSync();
  }, [processSync]);

  const value = useMemo(() => ({
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminderCompletion,
    hasOverdueReminders,
    isSyncingReminders,
    remindersSyncQueueCount,
    forceSyncReminders,
  }), [reminders, addReminder, updateReminder, deleteReminder, toggleReminderCompletion, hasOverdueReminders, isSyncingReminders, remindersSyncQueueCount, forceSyncReminders]);

  return React.createElement(RemindersContext.Provider, { value }, children);
};

// --- Hook ---
export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
};
