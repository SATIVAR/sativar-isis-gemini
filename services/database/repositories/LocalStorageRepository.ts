
import type { ISettingsRepository, IRemindersRepository } from './interfaces.ts';
import type { Settings, Reminder } from '../../../types.ts';

const SETTINGS_KEY = 'sativar_isis_settings';
const REMINDERS_KEY = 'sativar_isis_reminders';

// A helper function to manage reading reminders from localStorage
const readLocalReminders = async (): Promise<Reminder[]> => {
  try {
    const storedReminders = localStorage.getItem(REMINDERS_KEY);
    return storedReminders ? JSON.parse(storedReminders) : [];
  } catch (error) {
    console.error("Failed to load reminders from localStorage", error);
    return [];
  }
};

// A helper function to manage writing reminders to localStorage
const writeLocalReminders = async (reminders: Reminder[]): Promise<void> => {
   try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error("Failed to save reminders to localStorage", error);
    }
};

export class LocalStorageSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<Settings | null> {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
      return null;
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
      return null;
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  }
}

export class LocalStorageRemindersRepository implements IRemindersRepository {
  async getAllReminders(): Promise<Reminder[]> {
    return readLocalReminders();
  }
  
  // This method is used to cache the full list from the server
  async saveAllReminders(reminders: Reminder[]): Promise<void> {
    return writeLocalReminders(reminders);
  }

  async addReminder(reminder: Reminder): Promise<Reminder> {
    const reminders = await readLocalReminders();
    const newReminders = [...reminders, reminder];
    await writeLocalReminders(newReminders);
    return reminder;
  }

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    const reminders = await readLocalReminders();
    const newReminders = reminders.map(r => r.id === reminder.id ? reminder : r);
    await writeLocalReminders(newReminders);
    return reminder;
  }

  async deleteReminder(id: string): Promise<void> {
    const reminders = await readLocalReminders();
    const newReminders = reminders.filter(r => r.id !== id);
    await writeLocalReminders(newReminders);
  }
}