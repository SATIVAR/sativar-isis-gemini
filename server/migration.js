// server/migration.js
const { getDb } = require('./db');
const { getChatDb } = require('./chatDb');
const { getUserDb } = require('./userDb');
const { getSeishatDb } = require('./seishatDb');
const chalk = require('chalk');

const MAIN_DB_MIGRATION_SQL = `
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
  dueDate TEXT NOT NULL,
  notes TEXT,
  tasks TEXT,
  isCompleted INTEGER NOT NULL DEFAULT 0,
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
`;

const CHAT_DB_MIGRATION_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  is_closed INTEGER NOT NULL DEFAULT 0 -- 0 for false, 1 for true
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
  content TEXT NOT NULL, -- Stored as stringified JSON
  timestamp TEXT NOT NULL, -- ISO String
  is_action_complete INTEGER DEFAULT 0, -- 0 for false, 1 for true
  token_count INTEGER,
  duration INTEGER, -- in milliseconds
  FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
);

-- Trigger to update 'updated_at' on conversations when a new message is added
CREATE TRIGGER IF NOT EXISTS conversations_update_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
  UPDATE conversations SET updated_at = datetime('now', 'localtime') WHERE id = NEW.conversation_id;
END;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
`;

const USER_DB_MIGRATION_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'user')),
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TRIGGER IF NOT EXISTS users_update_trigger
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`;

const SEISHAT_DB_MIGRATION_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS associates (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  whatsapp TEXT,
  password TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('paciente', 'responsavel', 'tutor', 'colaborador')),
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TRIGGER IF NOT EXISTS products_update_trigger
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  UPDATE products SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS associates_update_trigger
AFTER UPDATE ON associates
FOR EACH ROW
BEGIN
  UPDATE associates SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_associates_full_name ON associates(full_name);
CREATE INDEX IF NOT EXISTS idx_associates_cpf ON associates(cpf);
`;

const SEISHAT_DB_MIGRATION_MYSQL = `
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS associates (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  whatsapp VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  type ENUM('paciente', 'responsavel', 'tutor', 'colaborador') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_associates_full_name ON associates(full_name);
CREATE INDEX idx_associates_cpf ON associates(cpf);
`;

const runSeishatMysqlMigration = async (pool) => {
    const connection = await pool.getConnection();
    try {
        console.log(chalk.magenta('[Migration] Running SEISHAT database migrations for MySQL...'));
        const statements = SEISHAT_DB_MIGRATION_MYSQL.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
            await connection.query(statement);
        }
        console.log(chalk.magenta('✅ SEISHAT MySQL migration completed successfully.'));
    } finally {
        connection.release();
    }
};


const runMigrations = async () => {
  try {
    const mainDb = getDb();
    console.log(chalk.blue('[Migration] Running MAIN database migrations for SQLite...'));
    mainDb.exec(MAIN_DB_MIGRATION_SQL);
    console.log(chalk.green('✅ MAIN Database migration completed successfully.'));

    const chatDb = getChatDb();
    console.log(chalk.cyan('[Migration] Running CHAT database migrations for SQLite...'));
    chatDb.exec(CHAT_DB_MIGRATION_SQL);
    console.log(chalk.cyan('✅ CHAT Database migration completed successfully.'));

    const userDb = getUserDb();
    console.log(chalk.yellow('[Migration] Running USER database migrations for SQLite...'));
    userDb.exec(USER_DB_MIGRATION_SQL);
    console.log(chalk.yellow('✅ USER Database migration completed successfully.'));

    const seishatDb = getSeishatDb();
    console.log(chalk.magenta('[Migration] Running SEISHAT database migrations for SQLite...'));
    seishatDb.exec(SEISHAT_DB_MIGRATION_SQL);
    console.log(chalk.magenta('✅ SEISHAT Database migration completed successfully.'));

  } catch (error) {
    console.error(chalk.red('❌ An error occurred during database migration.'));
    console.error(error);
    throw error;
  }
};

module.exports = { runMigrations, runSeishatMysqlMigration };