// server/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
require('dotenv').config();

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'sativar_isis.db');

let db;

const initializeDatabase = () => {
    try {
        // The 'verbose' option logs every query to the console, which is great for development.
        db = new Database(dbPath, { verbose: null }); // Set to console.log for intense debugging
        db.pragma('journal_mode = WAL');
        console.log(chalk.green.bold(`✅ Successfully connected to SQLite database at ${dbPath}`));
        return db;
    } catch (error) {
        console.error(chalk.red.bold('❌ Failed to connect to SQLite database.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
};

const getDb = () => {
    if (!db) {
        db = initializeDatabase();
    }
    return db;
};

// This function mimics the async nature of the previous `query` function for compatibility.
const query = async (sql, params = []) => {
    try {
        const dbInstance = getDb();
        const stmt = dbInstance.prepare(sql);
        
        // better-sqlite3 differentiates between queries that return data and those that don't.
        if (stmt.reader) {
            // .all() is for SELECT queries that can return multiple rows.
            return stmt.all(params);
        } else {
            // .run() is for INSERT, UPDATE, DELETE, etc., and returns info about the operation.
            return stmt.run(params);
        }
    } catch (err) {
        console.error(chalk.red.bold('\n===== DATABASE QUERY FAILED ====='));
        console.error(chalk.red('Error Message:'), chalk.yellow(err.message));
        console.error(chalk.red('SQL Query:'), chalk.magenta(sql));
        console.error(chalk.red('Parameters:'), chalk.magenta(JSON.stringify(params)));
        console.error(chalk.red.bold('===============================\n'));
        throw err;
    }
};

const testPoolConnection = async () => {
    try {
        const dbInstance = getDb();
        dbInstance.prepare('SELECT 1').get();
    } catch (error) {
        // Re-throw to be caught by the server startup logic
        throw error;
    }
};

module.exports = {
  getDb,
  query,
  testPoolConnection,
};
