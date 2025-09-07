const mysql = require('mysql2/promise');
const chalk = require('chalk');
require('dotenv').config();

let pool;

const getMySqlPool = () => {
    const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.DB_SSL === 'true' 
            ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } 
            : null,
    };

    console.log(chalk.yellow('Attempting to create MySQL connection pool with config:'));
    console.log(chalk.yellow(`  Host: ${dbConfig.host}`));
    console.log(chalk.yellow(`  Port: ${dbConfig.port}`));
    console.log(chalk.yellow(`  User: ${dbConfig.user}`));
    console.log(chalk.yellow(`  Database: ${dbConfig.database}`));
    console.log(chalk.yellow(`  SSL Enabled: ${!!dbConfig.ssl}`));
    
    const newPool = mysql.createPool(dbConfig);
    
    // Add event listeners for real-time logs
    newPool.on('acquire', (connection) => {
        console.log(chalk.cyan(`[DB Pool] Connection ${connection.threadId} acquired`));
    });
    newPool.on('connection', (connection) => {
        console.log(chalk.blue(`[DB Pool] New connection ${connection.threadId} established`));
    });
    newPool.on('release', (connection) => {
        console.log(chalk.cyan(`[DB Pool] Connection ${connection.threadId} released`));
    });
    newPool.on('error', (err) => {
        console.error(chalk.red.bold('[DB Pool] Fatal pool error:'), err);
    });

    return newPool;
};

const initializePool = () => {
    pool = getMySqlPool();
};

initializePool();

const query = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        // Return the direct results from mysql2: an array for SELECT, an OkPacket for INSERT/UPDATE
        return results;
    } catch (err) {
        console.error(chalk.red.bold('\n===== DATABASE QUERY FAILED ====='));
        console.error(chalk.red('Error Code:'), chalk.yellow(err.code));
        console.error(chalk.red('Error Message:'), chalk.yellow(err.message));
        console.error(chalk.red('SQL Query:'), chalk.magenta(sql));
        console.error(chalk.red('Parameters:'), chalk.magenta(JSON.stringify(params)));
        console.error(chalk.red.bold('===============================\n'));
        
        // Attempt to reconnect on connection errors
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'POOL_CLOSED') {
            console.log(chalk.yellow('Reconnecting to the database due to connection error...'));
            initializePool();
        }
        throw err;
    }
};

const testMysqlConnection = async (config) => {
    let connection;
    try {
        const sslConfig = config.ssl === true
            ? { rejectUnauthorized: config.ssl_reject_unauthorized !== false }
            : null;

        connection = await mysql.createConnection({
            host: config.host,
            port: config.port || 3306,
            user: config.user,
            password: config.password,
            database: config.database,
            connectTimeout: 10000, // 10 seconds timeout
            ssl: sslConfig,
        });
        await connection.query('SELECT 1'); // Simple query to confirm connection
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (connection) await connection.end();
    }
};

module.exports = {
  query,
  testMysqlConnection,
};
