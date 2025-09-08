// server/migration.js

const { pool } = require('./db'); 

// O SQL para criar as tabelas (você já o tem)
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS \`settings\` (
    \`id\` INT PRIMARY KEY,
    \`data\` JSON NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  CREATE TABLE IF NOT EXISTS \`reminders\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`quoteId\` VARCHAR(255),
    \`patientName\` VARCHAR(255) NOT NULL,
    \`dueDate\` DATETIME NOT NULL,
    \`notes\` TEXT,
    \`tasks\` JSON,
    \`isCompleted\` BOOLEAN NOT NULL DEFAULT FALSE,
    \`recurrence\` ENUM('none', 'daily', 'weekly', 'monthly') NOT NULL,
    \`priority\` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// O SQL para criar os índices
const CREATE_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_reminders_dueDate ON \`reminders\`(\`dueDate\`);
  CREATE INDEX IF NOT EXISTS idx_reminders_patientName ON \`reminders\`(\`patientName\`);
`;
// Nota: CREATE INDEX IF NOT EXISTS é mais seguro, mas pode não ser suportado em todas as versões do MySQL. 
// Como as tabelas são criadas com IF NOT EXISTS, o índice só será criado uma vez.

// O SQL para inserir a linha de configurações padrão
const INSERT_DEFAULT_SETTINGS_SQL = `
  INSERT IGNORE INTO \`settings\` (\`id\`, \`data\`) VALUES (1, '{}');
`;
// INSERT IGNORE é usado para evitar um erro se a linha com id=1 já existir.

const runMigrations = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[Migration] Connected to the database.');

    console.log('[Migration] Creating tables if they do not exist...');
    // O driver do mysql não suporta múltiplos comandos em uma única query por padrão por segurança.
    // Vamos executar cada comando separadamente.
    const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim() !== '');
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('[Migration] Tables created successfully or already exist.');
    
    // Para simplificar, vamos assumir que a criação dos índices pode ser feita separadamente
    // Em cenários mais complexos, seria necessário verificar se o índice já existe
    console.log('[Migration] Creating indexes...');
    const indexStatements = CREATE_INDEXES_SQL.split(';').filter(s => s.trim() !== '');
     for (const statement of indexStatements) {
      await connection.query(statement);
    }
    console.log('[Migration] Indexes created.');


    console.log('[Migration] Ensuring default settings record exists...');
    await connection.query(INSERT_DEFAULT_SETTINGS_SQL);
    console.log('[Migration] Default settings record ensured.');

    console.log('✅ Database migration completed successfully.');

  } catch (error) {
    console.error('❌ An error occurred during database migration.');
    console.error(error);
    // Lançar o erro novamente para que o processo de inicialização principal possa pegá-lo
    throw error;
  } finally {
    if (connection) {
      connection.release(); // Sempre libere a conexão de volta para o pool
      console.log('[Migration] Database connection released.');
    }
  }
};

module.exports = { runMigrations };