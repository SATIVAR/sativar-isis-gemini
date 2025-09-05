import { apiClient as databaseClient } from '../apiClient';

export interface NotificationLog {
  id: string;
  reminder_id: string;
  notification_type: string;
  sent_at: string;
  status: string;
}

class NotificationRepository {
  async hasNotification(reminderId: string, type: string): Promise<boolean> {
    try {
      const result = await databaseClient.query<NotificationLog>(
        `SELECT id FROM notification_log WHERE reminder_id = $1 AND notification_type = $2 LIMIT 1`,
        [reminderId, type]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error checking notification_log:', error);
      return false;
    }
  }

  async logNotification(reminderId: string, type: string, status: string = 'sent'): Promise<void> {
    try {
      await databaseClient.query(
        `INSERT INTO notification_log (id, reminder_id, notification_type, status) VALUES (gen_random_uuid(), $1, $2, $3)`,
        [reminderId, type, status]
      );
    } catch (error) {
      console.error('Error inserting into notification_log:', error);
    }
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;


