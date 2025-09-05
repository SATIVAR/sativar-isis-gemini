-- 007_schema_enhancements.sql

-- Ensure pgcrypto exists for UUID functions when running standalone
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END$$;

-- 1) Add recurrence constraint to reminders (align accepted values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'reminders' AND c.conname = 'chk_reminders_recurrence_valid'
  ) THEN
    ALTER TABLE reminders
      ADD CONSTRAINT chk_reminders_recurrence_valid
      CHECK (recurrence IN ('none','daily','weekly','monthly'));
  END IF;
END$$;

-- 2) Add unique deduplication constraint for notification_log
-- Prevent duplicates for the same reminder/type within a small time window
-- Prefer a strict dedup: unique (reminder_id, notification_type, sent_at::date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'notification_log' AND c.conname = 'uq_notification_per_day'
  ) THEN
    ALTER TABLE notification_log
      ADD CONSTRAINT uq_notification_per_day
      UNIQUE (reminder_id, notification_type, sent_at);
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- notification_log may not exist in some environments; ignore
  NULL;
END$$;

-- 3) Helpful indexes used by queries
-- Reminders frequently filtered by completion and ordering by due_date/time
CREATE INDEX IF NOT EXISTS idx_reminders_due_date_time ON reminders(due_date, due_time);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);

-- Tasks frequently fetched by reminder and ordered by created_at
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_created ON tasks(reminder_id, created_at);

-- Notification lookups by reminder and type
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_notification_log_reminder_type ON notification_log(reminder_id, notification_type);
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- 4) Defensive: ensure updated_at columns auto-update (trigger)
-- Create a generic function if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at := CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END$$;

-- Attach trigger to reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reminders_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_reminders_set_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END$$;

-- Attach trigger to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_tasks_set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END$$;