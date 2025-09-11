// server/index.js

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const chalk = require('chalk');
const { testPoolConnection } = require('./db');
const { testChatDbConnection } = require('./chatDb');
const { runMigrations } = require('./migration');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// The main async function to start the server
const startServer = async () => {
    try {
        // 1. Test database connections
        console.log(chalk.blue('Connecting to the main database...'));
        await testPoolConnection();
        console.log(chalk.green.bold('✅ Successfully connected to the main database.'));

        console.log(chalk.cyan('Connecting to the CHAT database...'));
        await testChatDbConnection();
        console.log(chalk.cyan.bold('✅ Successfully connected to the CHAT database.'));
        
        // 2. Run database migrations for both DBs
        console.log(chalk.blue('Running database migrations...'));
        await runMigrations();
        
        // 3. Configure middleware and routes ONLY after successful connection AND migration
        
        // Middleware
        app.use(cors());
        app.use(express.json({ limit: '10mb' }));

        // Public health check endpoint (does not require API key)
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok' });
        });

        // API Key Authentication Middleware
        const apiKeyAuth = (req, res, next) => {
            const apiKey = req.get('X-API-Key');
            const serverKey = process.env.API_SECRET_KEY;
            if (!serverKey) {
                console.error(chalk.red.bold('CRITICAL: API_SECRET_KEY is not set...'));
                return res.status(503).json({ error: 'Service Unavailable: API secret key not configured...' });
            }
            if (apiKey && apiKey === serverKey) {
                return next();
            }
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key.' });
        };

        // API Routes (all routes here are protected by apiKeyAuth)
        app.use('/api', apiKeyAuth, apiRoutes);

        // Error handler
        app.use((err, req, res, next) => {
            console.error(chalk.red.bold('\n===== UNHANDLED ERROR ====='));
            console.error(err.stack);
            res.status(500).json({ error: 'Internal Server Error' });
        });

        // 4. Start the Express server
        app.listen(port, () => {
          console.log(chalk.green(`🚀 SATIVAR-ISIS Backend listening at http://localhost:${port}`));
          if (!process.env.API_SECRET_KEY) {
              console.error(chalk.yellow.bold('CRITICAL SECURITY WARNING: ...'));
          }
        });

    } catch (error) {
        // The block catch now will catch errors from both connection and migration
        console.error(chalk.red.bold('❌ Failed to initialize the application.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
};

// Call the main function to start the application
startServer();