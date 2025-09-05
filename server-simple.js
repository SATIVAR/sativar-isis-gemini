import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL connection with better error handling
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

// Database connection status
let dbConnected = false;

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    dbConnected = true;
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    dbConnected = false;
  });

// Criar tabelas básicas se não existirem
async function initDatabase() {
  try {
    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Quotes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255),
        prescription_text TEXT,
        total_amount DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Reminders table (updated structure)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        due_date DATE NOT NULL,
        due_time TIME,
        is_completed BOOLEAN DEFAULT FALSE,
        quote_id VARCHAR(255),
        patient_name VARCHAR(255),
        recurrence VARCHAR(50) DEFAULT 'none',
        end_date DATE,
        parent_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        reminder_id VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    dbConnected = false;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), dbConnected });
});

// Database status
app.get('/api/db/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    dbConnected = true;
    res.json({
      success: true,
      connected: true,
      timestamp: result.rows[0].now
    });
  } catch (error) {
    dbConnected = false;
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// Generic query endpoint with better error handling
app.post('/api/db/query', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      error: 'Database not connected',
      code: 'DB_NOT_CONNECTED'
    });
  }

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
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      dbConnected = false;
    }
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
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
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
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
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
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
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
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

// Reminders endpoints (updated for new structure)
app.get('/api/reminders', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const remindersResult = await pool.query(`
      SELECT * FROM reminders ORDER BY due_date, due_time
    `);
    
    const reminders = [];
    for (const reminder of remindersResult.rows) {
      const tasksResult = await pool.query(
        'SELECT * FROM tasks WHERE reminder_id = $1 ORDER BY created_at',
        [reminder.id]
      );
      
      reminders.push({
        ...reminder,
        tasks: tasksResult.rows
      });
    }
    
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const { id, title, due_date, due_time, quote_id, patient_name, recurrence, end_date, parent_id, tasks = [] } = req.body;
    
    // Insert reminder
    const reminderResult = await pool.query(`
      INSERT INTO reminders (id, title, due_date, due_time, quote_id, patient_name, recurrence, end_date, parent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [id, title, due_date, due_time, quote_id, patient_name, recurrence, end_date, parent_id]);
    
    // Insert tasks
    const insertedTasks = [];
    for (const task of tasks) {
      const taskResult = await pool.query(`
        INSERT INTO tasks (id, reminder_id, text, is_completed)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [task.id, id, task.text, task.is_completed || false]);
      insertedTasks.push(taskResult.rows[0]);
    }
    
    res.json({
      ...reminderResult.rows[0],
      tasks: insertedTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reminder endpoint
app.put('/api/reminders/:id', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const { id } = req.params;
    const { title, due_date, due_time, is_completed, quote_id, patient_name, recurrence, end_date, parent_id, tasks = [] } = req.body;
    
    // Update reminder
    const reminderResult = await pool.query(`
      UPDATE reminders SET 
        title = $1, due_date = $2, due_time = $3, is_completed = $4,
        quote_id = $5, patient_name = $6, recurrence = $7, end_date = $8,
        parent_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 RETURNING *
    `, [title, due_date, due_time, is_completed, quote_id, patient_name, recurrence, end_date, parent_id, id]);
    
    // Delete existing tasks and insert new ones
    await pool.query('DELETE FROM tasks WHERE reminder_id = $1', [id]);
    
    const insertedTasks = [];
    for (const task of tasks) {
      const taskResult = await pool.query(`
        INSERT INTO tasks (id, reminder_id, text, is_completed)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [task.id, id, task.text, task.is_completed || false]);
      insertedTasks.push(taskResult.rows[0]);
    }
    
    res.json({
      ...reminderResult.rows[0],
      tasks: insertedTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reminder endpoint
app.delete('/api/reminders/:id', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const { id } = req.params;
    
    // Delete tasks first (cascade should handle this, but being explicit)
    await pool.query('DELETE FROM tasks WHERE reminder_id = $1', [id]);
    
    // Delete reminder
    const result = await pool.query('DELETE FROM reminders WHERE id = $1', [id]);
    
    res.json({ success: result.rowCount > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 SATIVAR-ISIS API Server running on port ${port}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`🗄️ Database Admin: http://localhost:8080`);
  
  // Initialize database if connected
  if (dbConnected) {
    await initDatabase();
  } else {
    console.log('⚠️ Starting without database connection - will retry on requests');
  }
});

export default app;