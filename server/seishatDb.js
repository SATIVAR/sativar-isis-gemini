
// server/seishatDb.js
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { query: mainDbQuery } = require('./db'); // To read the main settings
require('dotenv').config();

// --- State Variables ---
let dbMode = 'sqlite';
let sqliteDb;
let mysqlPool;

// --- SQLite Setup ---
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const sqliteDbPath = path.join(dbDir, 'sativar_isis_seishat.db');

const initializeSqlite = () => {
    try {
        if (!sqliteDb) {
            sqliteDb = new Database(sqliteDbPath, { verbose: null });
            sqliteDb.pragma('journal_mode = WAL');
        }
        return sqliteDb;
    } catch (error) {
        console.error(chalk.red.bold('❌ Failed to connect to SEISHAT (SQLite) database.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
};

// --- MySQL Setup ---
const initializeMysql = async () => {
    try {
        if (!mysqlPool) {
            mysqlPool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE || process.env.DB_NAME,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            const connection = await mysqlPool.getConnection();
            connection.release();
        }
        return mysqlPool;
    } catch (error) {
        console.error(chalk.red.bold('❌ Failed to connect to SEISHAT (MySQL) database.'));
        throw error;
    }
};

// --- Core Initializer (called on server start) ---
const initializeSeishatDatabase = async () => {
    let settings = {};
    try {
        const settingsRows = await mainDbQuery('SELECT data FROM settings WHERE id = 1');
        if (settingsRows.length > 0 && settingsRows[0].data) {
             settings = typeof settingsRows[0].data === 'string' ? JSON.parse(settingsRows[0].data) : settingsRows[0].data;
        }
    } catch (e) {
        console.error(chalk.yellow('Could not read main settings for DB mode, will use default.'), e.message);
    }

    // Default to MySQL, but allow override from settings
    dbMode = settings.seishat_database_mode || 'mysql';

    if (dbMode === 'mysql') {
        try {
            await initializeMysql();
            console.log(chalk.magenta.bold(`✅ SEISHAT module connected to MySQL database: ${process.env.DB_DATABASE || process.env.DB_NAME}`));
        } catch (mysqlError) {
            console.error(chalk.red.bold('❌ MySQL connection failed. Falling back to SQLite.'));
            console.error(chalk.red('MySQL Error:'), mysqlError.message);
            console.log(chalk.yellow('Please ensure MySQL environment variables (DB_HOST, DB_USER, etc.) are correctly set in the server\'s .env file.'));
            dbMode = 'sqlite'; // Set mode to reflect the fallback
            initializeSqlite();
            console.log(chalk.magenta.bold(`✅ SEISHAT module running in fallback SQLite mode at ${sqliteDbPath}`));
        }
    } else { // dbMode is 'sqlite'
        initializeSqlite();
        console.log(chalk.magenta.bold(`✅ SEISHAT module connected to SQLite database at ${sqliteDbPath}`));
    }
};

const getSeishatDb = () => {
    if (dbMode === 'mysql') {
        if (!mysqlPool) throw new Error("MySQL pool not initialized.");
        return mysqlPool;
    }
    if (!sqliteDb) initializeSqlite();
    return sqliteDb;
};

const seishatQuery = async (sql, params = []) => {
    try {
        if (dbMode === 'mysql') {
            const [rows] = await mysqlPool.execute(sql, params);
            return rows;
        } else {
            const stmt = sqliteDb.prepare(sql);
            return stmt.reader ? stmt.all(params) : stmt.run(params);
        }
    } catch (err) {
        console.error(chalk.red.bold('\n===== SEISHAT DB QUERY FAILED ====='));
        console.error(chalk.red('Mode:'), chalk.yellow(dbMode));
        console.error(chalk.red('Error Message:'), chalk.yellow(err.message));
        console.error(chalk.red('SQL Query:'), chalk.magenta(sql));
        console.error(chalk.red('Parameters:'), chalk.magenta(JSON.stringify(params)));
        console.error(chalk.red.bold('===============================\n'));
        throw err;
    }
};

const switchToMysql = async () => {
    if (mysqlPool) await mysqlPool.end();
    mysqlPool = null;
    dbMode = 'mysql';
    await initializeMysql();
    console.log(chalk.bgGreen.bold('✅ SEISHAT module has successfully switched to MySQL mode.'));
};

module.exports = {
  initializeSeishatDatabase,
  getSeishatDb,
  seishatQuery,
  switchToMysql,
  // This is a new export to allow other parts of the app to know the current mode.
  getDbMode: () => dbMode, 
};