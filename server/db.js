const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const getMySqlPool = () => {
    console.log("Creating MySQL connection pool...");
    const sslConfig = process.env.DB_SSL === 'true' 
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } 
        : null;

    return mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: sslConfig,
    });
};

const initializePool = () => {
    console.log("Connecting to MySQL database...");
    pool = getMySqlPool();
};

initializePool();

const query = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        // Return the direct results from mysql2: an array for SELECT, an OkPacket for INSERT/UPDATE
        return results;
    } catch (err) {
        console.error("Database query failed:", err.message);
        console.error("SQL:", sql);
        console.error("Params:", params);
        // Attempt to reconnect on connection errors
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            console.log('Reconnecting to the database...');
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