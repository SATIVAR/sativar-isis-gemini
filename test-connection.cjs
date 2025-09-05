const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'sativarisisv25',
  database: 'sativar_isis',
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed successfully:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();