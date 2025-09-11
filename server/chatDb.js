// server/chatDb.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
require('dotenv').config();

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'sativar_isis_chats.db');

let db;

const initializeDatabase = () => {
    try {
        db = new Database(dbPath, { verbose: null }); // Set to console.log for intense debugging
        db.pragma('journal_mode = WAL');
        console.log(chalk.cyan.bold(`✅ Successfully connected to CHAT database at ${dbPath}`));
        return db;
    } catch (error) {
        console.error(chalk.red.bold('❌ Failed to connect to CHAT database.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
};

const getChatDb = () => {
    if (!db) {
        db = initializeDatabase();
    }
    return db;
};

const chatQuery = async (sql, params = []) => {
    try {
        const dbInstance = getChatDb();
        const stmt = dbInstance.prepare(sql);
        
        if (stmt.reader) {
            return stmt.all(params);
        } else {
            return stmt.run(params);
        }
    } catch (err) {
        console.error(chalk.red.bold('\n===== CHAT DB QUERY FAILED ====='));
        console.error(chalk.red('Error Message:'), chalk.yellow(err.message));
        console.error(chalk.red('SQL Query:'), chalk.magenta(sql));
        console.error(chalk.red('Parameters:'), chalk.magenta(JSON.stringify(params)));
        console.error(chalk.red.bold('===============================\n'));
        throw err;
    }
};

const testChatDbConnection = async () => {
    try {
        const dbInstance = getChatDb();
        dbInstance.prepare('SELECT 1').get();
    } catch (error) {
        throw error;
    }
};

module.exports = {
  getChatDb,
  chatQuery,
  testChatDbConnection,
};
