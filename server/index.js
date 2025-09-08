// server/index.js

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const chalk = require('chalk');
const { testPoolConnection } = require('./db');
const { runMigrations } = require('./migration'); // <-- 1. ADICIONADO: Importa a função de migration
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
        
        // 2. Run database migrations
        console.log(chalk.blue('Running database migrations...')); // <-- 2. ADICIONADO: Inicia a migration
        await runMigrations(); // <-- 3. ADICIONADO: Executa e espera a migration terminar
        
        // 3. Configure middleware and routes ONLY after successful connection AND migration
        
        // Middleware
        app.use(cors());
        app.use(express.json({ limit: '10mb' }));

        // API Key Authentication Middleware (seu código de autenticação continua aqui...)
        const apiKeyAuth = (req, res, next) => {
            // ... (o resto do seu código permanece exatamente o mesmo) ...
            if (req.path === '/health') {
                return next();
            }
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


        // API Routes
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
        // O bloco catch agora vai pegar erros tanto da conexão quanto da migration
        console.error(chalk.red.bold('❌ Failed to initialize the application.'));
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
};

// Call the main function to start the application
startServer();