# Database Initialization Scripts

Before running the backend server for the first time, you need to create the `settings` and `reminders` tables in your MySQL database.

Choose the script that matches your `DB_TYPE` configuration (`mysql` or `postgres`) and execute it using a database management tool like Adminer, DBeaver, or the command-line interface.

---

## 1. MySQL

Execute the following SQL commands in your target MySQL database. This schema uses the `JSON` data type for flexibility where needed.

```sql
-- Table for a single settings object
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY,
  `data` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Normalized table for individual reminders
CREATE TABLE IF NOT EXISTS `reminders` (
  `id` VARCHAR(36) PRIMARY KEY,
  `quoteId` VARCHAR(255),
  `patientName` VARCHAR(255) NOT NULL,
  `dueDate` DATETIME NOT NULL,
  `notes` TEXT,
  `tasks` JSON,
  `isCompleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `recurrence` ENUM('none', 'daily', 'weekly', 'monthly') NOT NULL,
  `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for performance on common query columns
CREATE INDEX idx_reminders_dueDate ON `reminders`(`dueDate`);
CREATE INDEX idx_reminders_patientName ON `reminders`(`patientName`);
```

**Note on `settings` table:** The `id` for this table is hardcoded to `1` in the application logic, as it's designed to store a single JSON object for all settings.
