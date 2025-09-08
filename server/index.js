const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const chalk = require('chalk');
const { testPoolConnection } = require('./db'); // Import the test function
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// The main async function to start the server
const startServer = async () => {
    try {
        // 1. Test the database connection and wait for it to succeed
        console.log(chalk.blue('Connecting to the database...'));
        await testPoolConnection();
        console.log(chalk.green.bold('✅ Successfully connected to the database.'));
        
        // 2. Configure middleware and routes ONLY after successful connection
        
        // Middleware
        app.use(cors());
        app.use(express.json({ limit: '10mb' })); // Allow larger payloads for potential data migration

        // API Key Authentication Middleware
        const apiKeyAuth = (req, res, next) => {
            // The health check endpoint should always be public for online/offline detection.
            if (req.path === '/health') {
                return next();
            }

            const apiKey = req.get('X-API-Key');
            const serverKey = process.env.API_SECRET_KEY;
            
            // Security Hardening: If API_SECRET_KEY is not set on the server, all protected requests must fail.
            // This prevents accidentally exposing the API in production.
            if (!serverKey) {
                console.error(chalk.red.bold('CRITICAL: API_SECRET_KEY is not set. The API is inaccessible. Please set this variable in your .env file.'));
                return res.status(503).json({ error: 'Service Unavailable: API secret key not configured on the server.' });
            }

            if (apiKey && apiKey === serverKey) {
                return next(); // Key is valid
            }

            return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key.' });
        };


        // API Routes - all are protected by the auth middleware
        app.use('/api', apiKeyAuth, apiRoutes);

        // Catch-all error handler middleware
        app.use((err, req, res, next) => {
            console.error(chalk.red.bold('\n===== UNHANDLED ERROR ====='));
            console.error(chalk.red('Request:', `${req.method} ${req.originalUrl}`));
            console.error(err.stack);
            console.error(chalk.red.bold('===========================\n'));
            
            // Avoid sending stack trace to client in production
            if (res.headersSent) {
                return next(err);
            }
            res.status(500).json({ error: 'Internal Server Error' });
        });

        // 3. Start the Express server
        app.listen(port, () => {
          console.log(chalk.green(`🚀 SATIVAR-ISIS Backend listening at http://localhost:${port}`));
          if (!process.env.API_SECRET_KEY) {
              console.error(chalk.yellow.bold('CRITICAL SECURITY WARNING: API_SECRET_KEY is not defined in the environment. The API will not be accessible.'));
          }
        });

    } catch (error) {
        // 4. If the DB connection fails, log the detailed error and exit.
        console.error(chalk.red.bold('❌ Failed to connect to the database. The application will not start.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1); // Exit the process with a failure code
    }
};

// Call the main function to start the application
startServer();