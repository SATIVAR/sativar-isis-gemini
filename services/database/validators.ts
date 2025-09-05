import { ReminderModel, TaskModel, ValidationResult, ValidationErrorInfo, ValidationWarningInfo } from './types';
import { apiClient as databaseClient } from './apiClient';

export function validateTaskModel(task: TaskModel): ValidationResult {
  const errors: ValidationErrorInfo[] = [];
  const warnings: ValidationWarningInfo[] = [];

  if (!task) {
    errors.push({ code: 'TASK_NULL', message: 'Task is required' });
    return { isValid: false, errors, warnings };
  }

  if (!task.id || typeof task.id !== 'string') {
    errors.push({ code: 'TASK_ID_INVALID', message: 'Task id is required' , field: 'id' });
  }

  if (!task.reminderId || typeof task.reminderId !== 'string') {
    errors.push({ code: 'TASK_REMINDER_ID_INVALID', message: 'Task reminderId is required', field: 'reminderId' });
  }

  if (!task.title || task.title.trim().length === 0) {
    errors.push({ code: 'TASK_TITLE_EMPTY', message: 'Task title must not be empty', field: 'title' });
  }

  if (typeof task.isCompleted !== 'boolean') {
    errors.push({ code: 'TASK_COMPLETED_INVALID', message: 'Task isCompleted must be boolean', field: 'isCompleted' });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateReminderModel(reminder: ReminderModel): ValidationResult {
  const errors: ValidationErrorInfo[] = [];
  const warnings: ValidationWarningInfo[] = [];

  if (!reminder) {
    errors.push({ code: 'REMINDER_NULL', message: 'Reminder is required' });
    return { isValid: false, errors, warnings };
  }

  if (!reminder.id || typeof reminder.id !== 'string') {
    errors.push({ code: 'REMINDER_ID_INVALID', message: 'Reminder id is required', field: 'id' });
  }

  if (!reminder.title || reminder.title.trim().length === 0) {
    errors.push({ code: 'REMINDER_TITLE_EMPTY', message: 'Reminder title must not be empty', field: 'title' });
  }

  if (!(reminder.dueDate instanceof Date) || isNaN(reminder.dueDate.getTime())) {
    errors.push({ code: 'REMINDER_DUE_DATE_INVALID', message: 'Reminder dueDate must be a valid Date', field: 'dueDate' });
  }

  if (reminder.dueTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(reminder.dueTime)) {
    errors.push({ code: 'REMINDER_DUE_TIME_INVALID', message: 'Reminder dueTime must be HH:MM or HH:MM:SS', field: 'dueTime' });
  }

  if (typeof reminder.isCompleted !== 'boolean') {
    errors.push({ code: 'REMINDER_COMPLETED_INVALID', message: 'Reminder isCompleted must be boolean', field: 'isCompleted' });
  }

  if (reminder.version == null || typeof reminder.version !== 'number' || reminder.version < 1) {
    errors.push({ code: 'REMINDER_VERSION_INVALID', message: 'Reminder version must be a positive integer', field: 'version' });
  }

  if (Array.isArray(reminder.subtasks)) {
    for (const subtask of reminder.subtasks) {
      const subResult = validateTaskModel(subtask);
      if (!subResult.isValid) {
        errors.push(...subResult.errors.map(e => ({ ...e, field: e.field ? `subtasks.${e.field}` : 'subtasks' })));
      }
    }
  } else {
    errors.push({ code: 'REMINDER_SUBTASKS_INVALID', message: 'Reminder subtasks must be an array', field: 'subtasks' });
  }

  if (reminder.dueDate && reminder.createdAt && reminder.dueDate < reminder.createdAt) {
    warnings.push({ code: 'REMINDER_DUE_BEFORE_CREATE', message: 'Reminder dueDate is before createdAt', field: 'dueDate' });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// Integrity Validator interface and implementation
export interface IIntegrityValidator {
  validateReminder(reminder: ReminderModel): ValidationResult;
  validateTask(task: TaskModel): ValidationResult;
  validateReferentialIntegrity(): Promise<ValidationResult>;
  validateBusinessRules(data: any): ValidationResult;
}

export class IntegrityValidator implements IIntegrityValidator {
  validateReminder(reminder: ReminderModel): ValidationResult {
    const base = validateReminderModel(reminder);
    const errors: ValidationErrorInfo[] = [...base.errors];
    const warnings: ValidationWarningInfo[] = [...base.warnings];

    // Business constraints specific to reminders
    if (reminder.title && reminder.title.length > 255) {
      errors.push({ code: 'REMINDER_TITLE_TOO_LONG', message: 'Title must be at most 255 characters', field: 'title' });
    }

    if (reminder.priority && !['low', 'medium', 'high'].includes(reminder.priority)) {
      errors.push({ code: 'REMINDER_PRIORITY_INVALID', message: 'Priority must be low, medium, or high', field: 'priority' });
    }

    // Warn if due date is in the past (allowed but highlighted)
    if (reminder.dueDate instanceof Date && reminder.dueDate.getTime() < Date.now()) {
      warnings.push({ code: 'REMINDER_DUE_IN_PAST', message: 'Due date is in the past', field: 'dueDate' });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateTask(task: TaskModel): ValidationResult {
    const base = validateTaskModel(task);
    const errors: ValidationErrorInfo[] = [...base.errors];
    const warnings: ValidationWarningInfo[] = [...base.warnings];

    if (task.title && task.title.length > 255) {
      errors.push({ code: 'TASK_TITLE_TOO_LONG', message: 'Task title must be at most 255 characters', field: 'title' });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async validateReferentialIntegrity(): Promise<ValidationResult> {
    const errors: ValidationErrorInfo[] = [];
    const warnings: ValidationWarningInfo[] = [];

    try {
      // Orphan tasks (reminder_id does not exist in reminders)
      const orphanTasks = await databaseClient.query(
        `SELECT t.id FROM tasks t LEFT JOIN reminders r ON r.id = t.reminder_id WHERE r.id IS NULL LIMIT 50`
      );
      if (orphanTasks.rowCount > 0) {
        errors.push({ code: 'ORPHAN_TASKS', message: `Found ${orphanTasks.rowCount} tasks without existing reminder`, field: 'tasks.reminder_id' });
      }

      // Invalid self-referencing or missing parent for reminders with parent_id
      const invalidParents = await databaseClient.query(
        `SELECT c.id FROM reminders c LEFT JOIN reminders p ON p.id = c.parent_id WHERE c.parent_id IS NOT NULL AND p.id IS NULL LIMIT 50`
      );
      if (invalidParents.rowCount > 0) {
        errors.push({ code: 'REMINDER_PARENT_INVALID', message: `Found ${invalidParents.rowCount} reminders with non-existent parent`, field: 'reminders.parent_id' });
      }

      // Optional: duplicate task IDs under the same reminder (logical rule)
      // (Cannot check text duplicates reliably without business requirement; skipping)
    } catch (err: any) {
      warnings.push({ code: 'INTEGRITY_CHECK_FAILED', message: `Referential integrity check failed: ${String(err)}` });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateBusinessRules(data: any): ValidationResult {
    // Dispatch based on shape
    if (data && typeof data === 'object') {
      if ('subtasks' in data && 'dueDate' in data) {
        return this.validateReminder(data as ReminderModel);
      }
      if ('reminderId' in data && 'title' in data) {
        return this.validateTask(data as TaskModel);
      }
    }
    // If unknown data shape, mark as valid but warn
    return { isValid: true, errors: [], warnings: [{ code: 'UNKNOWN_ENTITY', message: 'No business rules applied to provided data' }] };
  }
}

export const integrityValidator = new IntegrityValidator();
