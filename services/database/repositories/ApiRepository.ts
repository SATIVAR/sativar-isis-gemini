

import type { ISettingsRepository, IRemindersRepository } from './interfaces.ts';
import type { Settings, Reminder } from '../../../types.ts';
import { apiClient } from '../apiClient.ts';

export class ApiSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<Settings | null> {
    return apiClient.get('/settings');
  }

  async saveSettings(settings: Settings): Promise<void> {
    await apiClient.post('/settings', settings);
  }
}

export class ApiRemindersRepository implements IRemindersRepository {
  async getAllReminders(): Promise<Reminder[]> {
    // The server now guarantees `tasks` is a parsed and valid array, so client-side processing is no longer needed.
    return apiClient.get<Reminder[]>('/reminders');
  }

  async addReminder(reminder: Reminder): Promise<Reminder> {
    return apiClient.post('/reminders', reminder);
  }

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    return apiClient.put(`/reminders/${reminder.id}`, reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    await apiClient.delete(`/reminders/${id}`);
  }

  // FIX: Implement saveAllReminders to satisfy the interface.
  // This is a no-op for the API repository as it's intended for local caching.
  async saveAllReminders(reminders: Reminder[]): Promise<void> {
    // This functionality is specific to the local storage repository for caching.
    // The API repository does not support a batch "save all" operation.
    return Promise.resolve();
  }
}
