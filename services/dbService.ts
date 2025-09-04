import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'sativar_user',
  password: process.env.DB_PASSWORD || 'sativar_password',
  database: process.env.DB_NAME || 'sativar_db',
});

// Function to get admin user by username
export const getAdminUser = async (username: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to create a new admin user
export const createAdminUser = async (username: string, passwordHash: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to get application settings
export const getAppSettings = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT system_prompt FROM app_settings ORDER BY updated_at DESC LIMIT 1'
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to update application settings
export const updateAppSettings = async (systemPrompt: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE app_settings SET system_prompt = $1, updated_at = CURRENT_TIMESTAMP RETURNING system_prompt',
      [systemPrompt]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to save quote history
export const saveQuoteHistory = async (patientName: string, internalSummary: string, patientMessage: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO quote_history (patient_name, internal_summary, patient_message) VALUES ($1, $2, $3) RETURNING id, created_at',
      [patientName, internalSummary, patientMessage]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to get quote history
export const getQuoteHistory = async (limit: number = 10) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, patient_name, internal_summary, created_at FROM quote_history ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export default pool;