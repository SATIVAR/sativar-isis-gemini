-- 005_sync_backup_notifications.sql

-- Enable pgcrypto for gen_random_uuid if not present
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END$$;

-- Sync operations queue table
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_type, entity_id);

-- Backup metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(20) NOT NULL,
  record_count INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  file_path VARCHAR(500) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_metadata_timestamp ON backup_metadata(timestamp);

-- Notification tracking table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_notification_log_reminder ON notification_log(reminder_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);