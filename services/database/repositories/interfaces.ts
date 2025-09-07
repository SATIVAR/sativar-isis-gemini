
import type { Settings, Reminder } from '../../../types.ts';

export interface ISettingsRepository {
  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;
}

export interface IRemindersRepository {
  getAllReminders(): Promise<Reminder[]>;
  addReminder(reminder: Reminder): Promise<Reminder>;
  updateReminder(reminder: Reminder): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  // FIX: Add saveAllReminders to the interface to support local caching operations.
  saveAllReminders(reminders: Reminder[]): Promise<void>;
}