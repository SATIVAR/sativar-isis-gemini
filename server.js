const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL connection - conecta diretamente ao Docker
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'sativarisisv25',
  database: process.env.DB_NAME || 'sativar_isis',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Criar tabelas básicas se não existirem
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255),
        prescription_text TEXT,
        total_amount DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMPTZ,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database status
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

// Generic query endpoint
app.post('/api/db/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    
    await pool.query(`
      INSERT INTO settings (key, value) 
      VALUES ($1, $2) 
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    `, [key, valueStr]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING *',
      [name, price, description]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quotes endpoints
app.get('/api/quotes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { patient_name, prescription_text, total_amount } = req.body;
    const result = await pool.query(
      'INSERT INTO quotes (patient_name, prescription_text, total_amount) VALUES ($1, $2, $3) RETURNING *',
      [patient_name, prescription_text, total_amount]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reminders endpoints
app.get('/api/reminders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reminders ORDER BY due_date');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    const result = await pool.query(
      'INSERT INTO reminders (title, description, due_date) VALUES ($1, $2, $3) RETURNING *',
      [title, description, due_date]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 SATIVAR-ISIS API Server running on port ${port}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  
  // Test connection and initialize database
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    await initDatabase();
  } catch (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  }
});

module.exports = app;