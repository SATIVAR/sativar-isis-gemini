-- Initialize SATIVAR-ISIS Database
-- This script creates the initial database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    association_name VARCHAR(255) NOT NULL DEFAULT '[Insira o Nome da Associação aqui]',
    about TEXT DEFAULT '[Insira uma breve descrição sobre a associação aqui]',
    operating_hours VARCHAR(255) DEFAULT 'Segunda a Sexta, das 9h às 18h',
    production_time VARCHAR(255) DEFAULT '7-10 dias úteis',
    address TEXT DEFAULT '[Insira o Endereço completo aqui]',
    whatsapp VARCHAR(50) DEFAULT '[Insira o WhatsApp com DDD aqui]',
    site VARCHAR(255) DEFAULT '[Insira o site aqui]',
    instagram VARCHAR(100) DEFAULT '[Insira o Instagram aqui]',
    pix_key VARCHAR(255) DEFAULT '[Insira a Chave PIX aqui]',
    company_name VARCHAR(255) DEFAULT '[Insira a Razão Social aqui]',
    bank_name VARCHAR(255) DEFAULT '[Insira o Nome do Banco aqui]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table for medical products catalog
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    settings_id INTEGER REFERENCES settings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table for task management
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    due_time TIME,
    is_completed BOOLEAN DEFAULT FALSE,
    quote_id UUID,
    patient_name VARCHAR(255),
    recurrence VARCHAR(20) DEFAULT 'none',
    end_date DATE,
    parent_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table for reminder subtasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table for prescription quotes
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name VARCHAR(255) NOT NULL,
    internal_summary TEXT,
    patient_message TEXT,
    medical_history TEXT,
    doctor_notes TEXT,
    observations TEXT,
    validity VARCHAR(100),
    total_value VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quoted products table for quote line items
CREATE TABLE IF NOT EXISTS quoted_products (
    id SERIAL PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity VARCHAR(50),
    concentration VARCHAR(100),
    status VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_id ON tasks(reminder_id);
CREATE INDEX IF NOT EXISTS idx_quotes_patient_name ON quotes(patient_name);
CREATE INDEX IF NOT EXISTS idx_quoted_products_quote_id ON quoted_products(quote_id);
CREATE INDEX IF NOT EXISTS idx_products_settings_id ON products(settings_id);

-- Insert initial migration record
INSERT INTO schema_migrations (version) VALUES ('001') ON CONFLICT (version) DO NOTHING;
INSERT INTO schema_migrations (version) VALUES ('002') ON CONFLICT (version) DO NOTHING;

-- Insert default settings if none exist
INSERT INTO settings (
    association_name, about, operating_hours, production_time,
    address, whatsapp, site, instagram, pix_key, company_name, bank_name
) 
SELECT 
    '[Insira o Nome da Associação aqui]',
    '[Insira uma breve descrição sobre a associação aqui]',
    'Segunda a Sexta, das 9h às 18h',
    '7-10 dias úteis',
    '[Insira o Endereço completo aqui]',
    '[Insira o WhatsApp com DDD aqui]',
    '[Insira o site aqui]',
    '[Insira o Instagram aqui]',
    '[Insira a Chave PIX aqui]',
    '[Insira a Razão Social aqui]',
    '[Insira o Nome do Banco aqui]'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Grant necessary permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;