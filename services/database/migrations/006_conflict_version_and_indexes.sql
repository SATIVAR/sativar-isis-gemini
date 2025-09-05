-- 006_conflict_version_and_indexes.sql

-- Ensure pgcrypto is available (for environments that run this independently)
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END$$;

-- Add version column to reminders for optimistic concurrency (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'version'
  ) THEN
    ALTER TABLE reminders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END$$;

-- Backfill nulls to 1 just in case (defensive)
UPDATE reminders SET version = 1 WHERE version IS NULL;

-- Helpful indexes for sync/conflict detection and queries
CREATE INDEX IF NOT EXISTS idx_reminders_updated_at ON reminders(updated_at);
CREATE INDEX IF NOT EXISTS idx_reminders_version ON reminders(version);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);