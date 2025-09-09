# Database Initialization Scripts for SQLite

This document contains the reference schema for the application's **SQLite** database.

**Note:** You do not need to run this script manually. The backend server is designed to automatically create the database file (`/server/data/sativar_isis.db`) and run these migrations on its first startup. This file is provided for documentation and debugging purposes.

---

## SQLite Schema

```sql
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Table for a single settings object
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Table for individual reminders
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  quoteId TEXT,
  patientName TEXT NOT NULL,
  dueDate TEXT NOT NULL, -- Stored as ISO string
  notes TEXT,
  tasks TEXT, -- Stored as a JSON string
  isCompleted INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
  recurrence TEXT NOT NULL CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Trigger to update 'updated_at' timestamp on settings update
CREATE TRIGGER IF NOT EXISTS settings_update_trigger
AFTER UPDATE ON settings
FOR EACH ROW
BEGIN
  UPDATE settings SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;

-- Trigger to update 'updated_at' timestamp on reminders update
CREATE TRIGGER IF NOT EXISTS reminders_update_trigger
AFTER UPDATE ON reminders
FOR EACH ROW
BEGIN
  UPDATE reminders SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_dueDate ON reminders(dueDate);
CREATE INDEX IF NOT EXISTS idx_reminders_patientName ON reminders(patientName);

-- Insert the default settings row if it doesn't exist
INSERT OR IGNORE INTO settings (id, data) VALUES (1, '{}');
```
