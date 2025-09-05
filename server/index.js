const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'sativarisisv25',
  database: process.env.DB_NAME || 'sativar_isis',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
  }
}

// Run database migrations
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Ensure migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get applied migrations
    const appliedResult = await pool.query('SELECT version FROM schema_migrations');
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.version));
    
    // Get available migration files
    const migrationsDir = path.join(__dirname, '../services/database/migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    let migrationsApplied = 0;
    
    for (const file of migrationFiles) {
      const version = path.basename(file, '.sql');
      
      if (appliedMigrations.has(version)) {
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`Successfully applied migration: ${file}`);
        migrationsApplied++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply migration ${file}:`, error.message);
        throw error;
      } finally {
        client.release();
      }
    }
    
    if (migrationsApplied === 0) {
      console.log('Database is already up to date.');
    } else {
      console.log(`Successfully applied ${migrationsApplied} new migration(s).`);
    }
  } catch (error) {
    console.error('Migration process failed:', error.message);
    throw error;
  }
}

// API Routes
app.post('/api/db/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    console.log('Executing query:', query.substring(0, 100) + '...');
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Database query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/db/transaction', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { queries } = req.body;
    
    await client.query('BEGIN');
    
    for (const { query, params = [] } of queries) {
      console.log('Executing transaction query:', query.substring(0, 100) + '...');
      await client.query(query, params);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Transaction completed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

app.get('/api/db/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      connected: true,
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle React routing in production
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const distPath = path.join(__dirname, '../dist/index.html');
    if (require('fs').existsSync(distPath)) {
      res.sendFile(distPath);
    } else {
      res.status(404).json({ 
        error: 'Frontend not built. Run "npm run build" first.' 
      });
    }
  });
} else {
  // In development, just return API info for non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.json({ 
      message: 'SATIVAR-ISIS API Server',
      mode: 'development',
      frontend: 'http://localhost:5173',
      endpoints: {
        health: '/api/health',
        status: '/api/db/status',
        query: '/api/db/query',
        transaction: '/api/db/transaction'
      }
    });
  });
}

// Start server with error handling
const server = app.listen(port, async () => {
  console.log(`\n🚀 SATIVAR-ISIS API Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 Frontend: http://localhost:5173`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  }
  
  await testConnection();
  
  // Run migrations after successful connection
  try {
    await runMigrations();
    console.log('✅ Server initialization completed successfully\n');
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    // Don't exit the process, but log the error
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please:`);
    console.error('1. Check if another instance is running');
    console.error('2. Kill the process using: taskkill /f /im node.exe');
    console.error('3. Or use a different port by setting PORT environment variable');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

module.exports = app;