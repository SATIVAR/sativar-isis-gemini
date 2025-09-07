// This is a simple script to test the database connection using credentials from the .env file.
// To run: npm test

require('dotenv').config();
const mysql = require('mysql2/promise');
const chalk = require('chalk');
const assert = require('assert');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 5000, // 5 seconds
    ssl: process.env.DB_SSL === 'true' 
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } 
        : null,
};

async function runTest() {
    console.log(chalk.blue.bold('===== Running MySQL Connection Test ====='));
    
    // Check if essential variables are defined
    try {
        assert.ok(dbConfig.host, 'DB_HOST is not defined in .env');
        assert.ok(dbConfig.user, 'DB_USER is not defined in .env');
        assert.ok(dbConfig.password, 'DB_PASSWORD is not defined in .env');
        assert.ok(dbConfig.database, 'DB_NAME is not defined in .env');
        console.log(chalk.green('✓ .env variables are present.'));
    } catch (error) {
        console.error(chalk.red.bold(`\n[FAIL] Configuration error: ${error.message}`));
        console.log(chalk.yellow('Please ensure your /server/.env file is correctly configured.'));
        process.exit(1);
    }

    console.log(chalk.cyan(`Attempting to connect to ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}...`));
    
    let connection;
    try {
        // Step 1: Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log(chalk.green('✓ Connection established successfully.'));

        // Step 2: Test with a simple query
        const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
        console.log(chalk.cyan('Executing test query: SELECT 1 + 1 AS solution'));
        assert.strictEqual(rows[0].solution, 2, 'Test query did not return the expected result.');
        console.log(chalk.green('✓ Test query executed successfully. Result:', rows[0].solution));

        console.log(chalk.green.bold('\n[SUCCESS] Database connection test passed!'));

    } catch (error) {
        console.error(chalk.red.bold('\n[FAIL] Database connection test failed.'));
        console.error(chalk.red('Error Code:'), chalk.yellow(error.code));
        console.error(chalk.red('Error Message:'), chalk.yellow(error.message));
        console.log(chalk.yellow('\nCommon issues to check:'));
        console.log(chalk.yellow('  - Are the DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in .env correct?'));
        console.log(chalk.yellow('  - Is the database server running and accessible from this machine?'));
        console.log(chalk.yellow('  - Is there a firewall blocking the connection on the specified DB_PORT?'));
        console.log(chalk.yellow('  - If using SSL, are the SSL settings correct?'));
        process.exit(1); // Exit with a failure code
    } finally {
        if (connection) {
            await connection.end();
            console.log(chalk.cyan('Connection closed.'));
        }
        console.log(chalk.blue.bold('======================================='));
    }
}

runTest();
