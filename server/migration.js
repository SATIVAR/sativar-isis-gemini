// server/migration.js
const { getDb } = require('./db');
const { getChatDb } = require('./chatDb');
const { getUserDb } = require('./userDb');
const { getSeishatDb, getDbMode } = require('./seishatDb');
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

-- Drop old form tables to replace them
DROP TABLE IF EXISTS form_layouts;
DROP TABLE IF EXISTS associate_type_form_config;

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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  whatsapp TEXT,
  password TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('paciente', 'responsavel', 'tutor', 'colaborador')),
  custom_fields TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK(field_type IN ('text', 'email', 'select', 'password', 'textarea', 'checkbox', 'radio', 'separator', 'brazilian_states_select')),
    is_base_field INTEGER NOT NULL DEFAULT 0,
    is_deletable INTEGER NOT NULL DEFAULT 0,
    options TEXT
);

CREATE TABLE IF NOT EXISTS form_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    associate_type TEXT NOT NULL,
    title TEXT NOT NULL,
    step_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS form_layout_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER NOT NULL,
    field_id INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    visibility_conditions TEXT,
    FOREIGN KEY (step_id) REFERENCES form_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_form_steps_associate_type ON form_steps(associate_type);
CREATE INDEX IF NOT EXISTS idx_form_layout_fields_step_id ON form_layout_fields(step_id);

INSERT OR IGNORE INTO form_fields (id, field_name, label, field_type, is_base_field, is_deletable, options) VALUES
(1, 'full_name', 'Nome Completo', 'text', 1, 0, NULL),
(2, 'password', 'Senha', 'password', 1, 0, NULL),
(3, 'type', 'Tipo de Associado', 'select', 1, 0, '["paciente", "responsavel", "tutor", "colaborador"]'),
(4, 'cpf', 'CPF', 'text', 1, 0, NULL),
(5, 'whatsapp', 'WhatsApp', 'text', 1, 0, NULL);
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
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  whatsapp VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  type ENUM('paciente', 'responsavel', 'tutor', 'colaborador') NOT NULL,
  custom_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'email', 'select', 'password', 'textarea', 'checkbox', 'radio', 'separator', 'brazilian_states_select') NOT NULL,
  is_base_field BOOLEAN NOT NULL DEFAULT FALSE,
  is_deletable BOOLEAN NOT NULL DEFAULT FALSE,
  options TEXT
);

CREATE TABLE IF NOT EXISTS form_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  associate_type VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  step_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS form_layout_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step_id INT NOT NULL,
  field_id INT NOT NULL,
  display_order INT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  visibility_conditions TEXT,
  FOREIGN KEY (step_id) REFERENCES form_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_associates_full_name ON associates(full_name);
CREATE INDEX idx_associates_cpf ON associates(cpf);
CREATE INDEX idx_form_steps_associate_type ON form_steps(associate_type);
CREATE INDEX idx_form_layout_fields_step_id ON form_layout_fields(step_id);
`;

const runSeishatMysqlMigration = async (pool) => {
    const connection = await pool.getConnection();
    try {
        console.log(chalk.magenta('[Migration] Running SEISHAT database migrations for MySQL...'));
        
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        await connection.query('DROP TABLE IF EXISTS associate_type_form_config, form_layout_fields, form_steps, form_layouts;');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        const statements = SEISHAT_DB_MIGRATION_MYSQL.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                if (err.errno === 1061) {
                    console.log(chalk.yellow(`[Migration] Index already exists, skipping statement.`));
                } else {
                    throw err;
                }
            }
        }

        // Check and add missing visibility_conditions column for MySQL
        const [layoutColumns] = await connection.query(`SHOW COLUMNS FROM form_layout_fields LIKE 'visibility_conditions';`);
        if (layoutColumns.length === 0) {
            console.log(chalk.yellow('[Migration] Altering MySQL table "form_layout_fields" to add "visibility_conditions" column...'));
            await connection.query(`ALTER TABLE form_layout_fields ADD COLUMN visibility_conditions TEXT;`);
            console.log(chalk.green('[Migration] MySQL column "visibility_conditions" added successfully.'));
        }

        // Check and add missing custom_fields column for MySQL
        const [associateColumns] = await connection.query(`SHOW COLUMNS FROM associates LIKE 'custom_fields';`);
        if (associateColumns.length === 0) {
            console.log(chalk.yellow('[Migration] Altering MySQL table "associates" to add "custom_fields" column...'));
            await connection.query(`ALTER TABLE associates ADD COLUMN custom_fields JSON;`);
            console.log(chalk.green('[Migration] MySQL column "custom_fields" added successfully.'));
        }
        
        const populateSql = `
            INSERT INTO form_fields (id, field_name, label, field_type, is_base_field, is_deletable, options) VALUES
            (1, 'full_name', 'Nome Completo', 'text', 1, 0, NULL),
            (2, 'password', 'Senha', 'password', 1, 0, NULL),
            (3, 'type', 'Tipo de Associado', 'select', 1, 0, '["paciente", "responsavel", "tutor", "colaborador"]'),
            (4, 'cpf', 'CPF', 'text', 1, 0, NULL),
            (5, 'whatsapp', 'WhatsApp', 'text', 1, 0, NULL)
            ON DUPLICATE KEY UPDATE 
                label=VALUES(label), 
                field_type=VALUES(field_type), 
                is_base_field=VALUES(is_base_field), 
                is_deletable=VALUES(is_deletable), 
                options=VALUES(options);
        `;
        await connection.query(populateSql);

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
    const mode = getDbMode();

    if (mode === 'sqlite' && seishatDb && seishatDb.constructor.name === 'Database') {
        console.log(chalk.magenta('[Migration] Running SEISHAT database migrations for SQLite...'));
        seishatDb.exec(SEISHAT_DB_MIGRATION_SQL);

        // Check and add missing columns to tables if necessary
        const checkAndAddColumn = (db, table, column, type) => {
            const tableInfo = db.prepare(`PRAGMA table_info(${table});`).all();
            const columnExists = tableInfo.some(c => c.name === column);
            if (!columnExists) {
                console.log(chalk.yellow(`[Migration] Altering SQLite table "${table}" to add "${column}" column...`));
                db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`).run();
                console.log(chalk.green(`[Migration] SQLite column "${column}" added successfully to "${table}".`));
            }
        };
        
        checkAndAddColumn(seishatDb, 'form_layout_fields', 'visibility_conditions', 'TEXT');
        checkAndAddColumn(seishatDb, 'associates', 'custom_fields', 'TEXT');
        
        console.log(chalk.magenta('✅ SEISHAT SQLite migration completed successfully.'));
    } else if (mode === 'mysql' && seishatDb && typeof seishatDb.getConnection === 'function') {
        await runSeishatMysqlMigration(seishatDb);
    } else {
         console.log(chalk.magenta(`[Migration] Skipping SEISHAT migrations (DB mode: ${mode}, DB state unknown).`));
    }

  } catch (error) {
    console.error(chalk.red('❌ An error occurred during database migration.'));
    console.error(error);
    throw error;
  }
};

module.exports = { runMigrations, runSeishatMysqlMigration };