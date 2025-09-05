-- 001_initial_schema.sql

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    association_name VARCHAR(255) NOT NULL,
    about TEXT,
    operating_hours VARCHAR(255),
    production_time VARCHAR(255),
    address TEXT,
    whatsapp VARCHAR(50),
    site VARCHAR(255),
    instagram VARCHAR(100),
    pix_key VARCHAR(255),
    company_name VARCHAR(255),
    bank_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products table for medical products catalog
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    settings_id INTEGER REFERENCES settings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table for task management
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    due_time TIME,
    is_completed BOOLEAN DEFAULT FALSE,
    quote_id UUID,
    patient_name VARCHAR(255),
    recurrence VARCHAR(20) DEFAULT 'none',
    end_date DATE,
    parent_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table for reminder subtasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table for prescription quotes
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(255) NOT NULL,
    internal_summary TEXT,
    patient_message TEXT,
    medical_history TEXT,
    doctor_notes TEXT,
    observations TEXT,
    validity VARCHAR(100),
    total_value VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Quoted products table for quote line items
CREATE TABLE IF NOT EXISTS quoted_products (
    id SERIAL PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity VARCHAR(50),
    concentration VARCHAR(100),
    status VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);