-- 003_add_constraints.sql

-- Add additional constraints for data integrity
ALTER TABLE settings 
    ADD CONSTRAINT chk_association_name_not_empty CHECK (LENGTH(TRIM(association_name)) > 0);

ALTER TABLE products 
    ADD CONSTRAINT chk_product_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    ADD CONSTRAINT chk_product_price_positive CHECK (price > 0);

ALTER TABLE reminders 
    ADD CONSTRAINT chk_reminder_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);

ALTER TABLE tasks 
    ADD CONSTRAINT chk_task_text_not_empty CHECK (LENGTH(TRIM(text)) > 0);

ALTER TABLE quotes 
    ADD CONSTRAINT chk_quote_patient_name_not_empty CHECK (LENGTH(TRIM(patient_name)) > 0);

ALTER TABLE quoted_products 
    ADD CONSTRAINT chk_quoted_product_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE admin_users 
    ADD CONSTRAINT chk_username_not_empty CHECK (LENGTH(TRIM(username)) > 0),
    ADD CONSTRAINT chk_password_hash_not_empty CHECK (LENGTH(TRIM(password_hash)) > 0);