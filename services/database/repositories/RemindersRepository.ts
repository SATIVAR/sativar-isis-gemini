import { apiClient as databaseClient } from '../apiClient';
import type { Reminder, Task } from '../../../types';

class RemindersRepository {
  async getAllReminders(): Promise<Reminder[]> {
    try {
      const remindersResult = await databaseClient.query(`
        SELECT * FROM reminders ORDER BY due_date, due_time
      `);

      const reminders: Reminder[] = [];

      for (const reminderRow of remindersResult.rows) {
        // Get tasks for this reminder
        const tasksResult = await databaseClient.query(`
          SELECT * FROM tasks WHERE reminder_id = $1 ORDER BY created_at
        `, [reminderRow.id]);

        const tasks: Task[] = tasksResult.rows.map((taskRow: any) => ({
          id: taskRow.id,
          text: taskRow.text,
          isCompleted: taskRow.is_completed
        }));

        const reminder: Reminder = {
          id: reminderRow.id,
          title: reminderRow.title,
          dueDate: reminderRow.due_date,
          dueTime: reminderRow.due_time,
          isCompleted: reminderRow.is_completed,
          quoteId: reminderRow.quote_id,
          patientName: reminderRow.patient_name,
          recurrence: reminderRow.recurrence || 'none',
          endDate: reminderRow.end_date,
          parentId: reminderRow.parent_id,
          tasks: tasks
        };

        reminders.push(reminder);
      }

      return reminders;
    } catch (error) {
      console.error('Error getting all reminders:', error);
      return [];
    }
  }

  async createReminder(reminderData: {
    title: string;
    dueDate: string;
    dueTime?: string;
    quoteId?: string;
    patientName?: string;
    recurrence?: string;
    endDate?: string;
    parentId?: string;
    tasks: Array<{ text: string; isCompleted: boolean }>;
  }): Promise<Reminder> {
    try {
      // Generate UUID for reminder
      const reminderId = crypto.randomUUID();

      // Insert reminder
      await databaseClient.query(`
        INSERT INTO reminders (
          id, title, due_date, due_time, is_completed, quote_id,
          patient_name, recurrence, end_date, parent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        reminderId,
        reminderData.title,
        reminderData.dueDate,
        reminderData.dueTime || null,
        false,
        reminderData.quoteId || null,
        reminderData.patientName || null,
        reminderData.recurrence || 'none',
        reminderData.endDate || null,
        reminderData.parentId || null
      ]);

      // Insert tasks
      const tasks: Task[] = [];
      for (const taskData of reminderData.tasks) {
        const taskId = crypto.randomUUID();
        
        await databaseClient.query(`
          INSERT INTO tasks (id, reminder_id, text, is_completed)
          VALUES ($1, $2, $3, $4)
        `, [
          taskId,
          reminderId,
          taskData.text,
          taskData.isCompleted
        ]);

        tasks.push({
          id: taskId,
          text: taskData.text,
          isCompleted: taskData.isCompleted
        });
      }

      const reminder: Reminder = {
        id: reminderId,
        title: reminderData.title,
        dueDate: reminderData.dueDate,
        dueTime: reminderData.dueTime,
        isCompleted: false,
        quoteId: reminderData.quoteId,
        patientName: reminderData.patientName,
        recurrence: reminderData.recurrence || 'none',
        endDate: reminderData.endDate,
        parentId: reminderData.parentId,
        tasks: tasks
      };

      return reminder;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    try {
      // Update reminder
      await databaseClient.query(`
        UPDATE reminders SET
          title = $1,
          due_date = $2,
          due_time = $3,
          is_completed = $4,
          quote_id = $5,
          patient_name = $6,
          recurrence = $7,
          end_date = $8,
          parent_id = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `, [
        reminder.title,
        reminder.dueDate,
        reminder.dueTime || null,
        reminder.isCompleted,
        reminder.quoteId || null,
        reminder.patientName || null,
        reminder.recurrence || 'none',
        reminder.endDate || null,
        reminder.parentId || null,
        reminder.id
      ]);

      // Delete existing tasks
      await databaseClient.query('DELETE FROM tasks WHERE reminder_id = $1', [reminder.id]);

      // Insert updated tasks
      for (const task of reminder.tasks) {
        await databaseClient.query(`
          INSERT INTO tasks (id, reminder_id, text, is_completed)
          VALUES ($1, $2, $3, $4)
        `, [
          task.id,
          reminder.id,
          task.text,
          task.isCompleted
        ]);
      }

      return reminder;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }

  async getReminderRaw(id: string): Promise<any | null> {
    try {
      const result = await databaseClient.query(`SELECT * FROM reminders WHERE id = $1`, [id]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting reminder raw:', error);
      throw error;
    }
  }

  async updateReminderWithVersion(reminder: Reminder, expectedVersion: number): Promise<{ updated: boolean; newVersion?: number }> {
    try {
      const result = await databaseClient.query(
        `UPDATE reminders SET 
           title = $1,
           due_date = $2,
           due_time = $3,
           is_completed = $4,
           quote_id = $5,
           patient_name = $6,
           recurrence = $7,
           end_date = $8,
           parent_id = $9,
           updated_at = CURRENT_TIMESTAMP,
           version = version + 1
         WHERE id = $10 AND version = $11
         RETURNING version`,
        [
          reminder.title,
          reminder.dueDate,
          reminder.dueTime || null,
          reminder.isCompleted,
          reminder.quoteId || null,
          reminder.patientName || null,
          reminder.recurrence || 'none',
          reminder.endDate || null,
          reminder.parentId || null,
          reminder.id,
          expectedVersion
        ]
      );

      if (result.rowCount === 0) {
        return { updated: false };
      }

      // Replace tasks fully according to current design
      await databaseClient.query('DELETE FROM tasks WHERE reminder_id = $1', [reminder.id]);
      for (const task of reminder.tasks) {
        await databaseClient.query(
          `INSERT INTO tasks (id, reminder_id, text, is_completed)
           VALUES ($1, $2, $3, $4)`,
          [task.id, reminder.id, task.text, task.isCompleted]
        );
      }

      const newVersion = result.rows[0]?.version as number | undefined;
      return { updated: true, newVersion };
    } catch (error) {
      console.error('Error updating reminder with version:', error);
      throw error;
    }
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    try {
      // Delete tasks first (due to foreign key constraint)
      await databaseClient.query('DELETE FROM tasks WHERE reminder_id = $1', [reminderId]);
      
      // Delete reminder
      const result = await databaseClient.query('DELETE FROM reminders WHERE id = $1', [reminderId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Reminder[]> {
    try {
      const remindersResult = await databaseClient.query(`
        SELECT * FROM reminders 
        WHERE due_date BETWEEN $1 AND $2 
        ORDER BY due_date, due_time
      `, [startDate, endDate]);

      const reminders: Reminder[] = [];

      for (const reminderRow of remindersResult.rows) {
        const tasksResult = await databaseClient.query(`
          SELECT * FROM tasks WHERE reminder_id = $1 ORDER BY created_at
        `, [reminderRow.id]);

        const tasks: Task[] = tasksResult.rows.map((taskRow: any) => ({
          id: taskRow.id,
          text: taskRow.text,
          isCompleted: taskRow.is_completed
        }));

        const reminder: Reminder = {
          id: reminderRow.id,
          title: reminderRow.title,
          dueDate: reminderRow.due_date,
          dueTime: reminderRow.due_time,
          isCompleted: reminderRow.is_completed,
          quoteId: reminderRow.quote_id,
          patientName: reminderRow.patient_name,
          recurrence: reminderRow.recurrence || 'none',
          endDate: reminderRow.end_date,
          parentId: reminderRow.parent_id,
          tasks: tasks
        };

        reminders.push(reminder);
      }

      return reminders;
    } catch (error) {
      console.error('Error finding reminders by date range:', error);
      return [];
    }
  }

  async findOverdue(): Promise<Reminder[]> {
    try {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];

      const remindersResult = await databaseClient.query(`
        SELECT * FROM reminders 
        WHERE is_completed = false 
        AND (
          due_date < $1 
          OR (due_date = $1 AND due_time < $2)
        )
        ORDER BY due_date, due_time
      `, [currentDate, currentTime]);

      const reminders: Reminder[] = [];

      for (const reminderRow of remindersResult.rows) {
        const tasksResult = await databaseClient.query(`
          SELECT * FROM tasks WHERE reminder_id = $1 ORDER BY created_at
        `, [reminderRow.id]);

        const tasks: Task[] = tasksResult.rows.map((taskRow: any) => ({
          id: taskRow.id,
          text: taskRow.text,
          isCompleted: taskRow.is_completed
        }));

        const reminder: Reminder = {
          id: reminderRow.id,
          title: reminderRow.title,
          dueDate: reminderRow.due_date,
          dueTime: reminderRow.due_time,
          isCompleted: reminderRow.is_completed,
          quoteId: reminderRow.quote_id,
          patientName: reminderRow.patient_name,
          recurrence: reminderRow.recurrence || 'none',
          endDate: reminderRow.end_date,
          parentId: reminderRow.parent_id,
          tasks: tasks
        };

        reminders.push(reminder);
      }

      return reminders;
    } catch (error) {
      console.error('Error finding overdue reminders:', error);
      return [];
    }
  }

  async toggleTask(reminderId: string, taskId: string): Promise<boolean> {
    try {
      // Get current task state
      const taskResult = await databaseClient.query(
        'SELECT is_completed FROM tasks WHERE id = $1 AND reminder_id = $2',
        [taskId, reminderId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const currentState = taskResult.rows[0].is_completed;
      const newState = !currentState;

      // Update task
      await databaseClient.query(
        'UPDATE tasks SET is_completed = $1 WHERE id = $2',
        [newState, taskId]
      );

      // Check if all tasks are completed to update reminder status
      const allTasksResult = await databaseClient.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN is_completed = true THEN 1 END) as completed FROM tasks WHERE reminder_id = $1',
        [reminderId]
      );

      const { total, completed } = allTasksResult.rows[0];
      const allCompleted = parseInt(total) === parseInt(completed);

      // Update reminder completion status
      await databaseClient.query(
        'UPDATE reminders SET is_completed = $1 WHERE id = $2',
        [allCompleted, reminderId]
      );

      return true;
    } catch (error) {
      console.error('Error toggling task:', error);
      throw error;
    }
  }
}

export const remindersRepository = new RemindersRepository();
export default remindersRepository;