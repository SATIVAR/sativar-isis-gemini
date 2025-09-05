-- 002_add_indexes.sql

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_settings_id ON products(settings_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_quote_id ON reminders(quote_id);
CREATE INDEX IF NOT EXISTS idx_reminders_parent_id ON reminders(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_id ON tasks(reminder_id);
CREATE INDEX IF NOT EXISTS idx_quotes_patient_name ON quotes(patient_name);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quoted_products_quote_id ON quoted_products(quote_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login ON admin_users(last_login);