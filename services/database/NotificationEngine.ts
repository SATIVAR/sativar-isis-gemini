import { remindersRepository } from './repositories/RemindersRepository';
import { notificationRepository } from './repositories/NotificationRepository';
import type { Reminder } from '../../types';

type EngineOptions = {
  checkIntervalMs?: number;
  notificationType?: string;
};

export class NotificationEngine {
  private intervalId: any = null;
  private options: Required<EngineOptions>;

  constructor(options: EngineOptions = {}) {
    this.options = {
      checkIntervalMs: options.checkIntervalMs ?? 30_000,
      notificationType: options.notificationType ?? 'due',
    };
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.checkAndLogNotifications().catch((e) => console.error('NotificationEngine error:', e));
    }, this.options.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAndLogNotifications(): Promise<Reminder[]> {
    const overdue = await remindersRepository.findOverdue();
    const toNotify: Reminder[] = [];

    for (const r of overdue) {
      const already = await notificationRepository.hasNotification(r.id, this.options.notificationType);
      if (!already) {
        await notificationRepository.logNotification(r.id, this.options.notificationType, 'sent');
        toNotify.push(r);
        await this.maybeCreateNextRecurringInstance(r);
      }
    }

    return toNotify;
  }

  private async maybeCreateNextRecurringInstance(reminder: Reminder): Promise<void> {
    try {
      const recurrence = reminder.recurrence || 'none';
      if (recurrence === 'none') return;

      if (reminder.endDate) {
        const end = new Date(reminder.endDate);
        const due = new Date(`${reminder.dueDate}T${reminder.dueTime || '00:00:00'}`);
        if (due > end) return;
      }

      const nextDueDate = this.computeNextDate(reminder.dueDate, recurrence);
      if (!nextDueDate) return;

      if (reminder.endDate && new Date(nextDueDate) > new Date(reminder.endDate)) return;

      const nextTasks = reminder.tasks.map(t => ({ text: t.text, isCompleted: false }));

      await remindersRepository.createReminder({
        title: reminder.title,
        dueDate: nextDueDate,
        dueTime: reminder.dueTime,
        quoteId: reminder.quoteId,
        patientName: reminder.patientName,
        recurrence: reminder.recurrence,
        endDate: reminder.endDate,
        parentId: reminder.parentId || reminder.id,
        tasks: nextTasks,
      });
    } catch (e) {
      console.error('Error creating next recurring instance:', e);
    }
  }

  private computeNextDate(dateStr: string, recurrence: NonNullable<Reminder['recurrence']>): string | null {
    try {
      const [year, month, day] = dateStr.split('-').map(n => parseInt(n));
      const d = new Date(year, month - 1, day);
      if (recurrence === 'daily') {
        d.setDate(d.getDate() + 1);
      } else if (recurrence === 'weekly') {
        d.setDate(d.getDate() + 7);
      } else if (recurrence === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else {
        return null;
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return null;
    }
  }
}

export const notificationEngine = new NotificationEngine();


