const { Pool } = require('pg');

// Database configuration
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

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database query successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    client.release();
    
    // Test migrations table
    try {
      const migrationResult = await pool.query('SELECT COUNT(*) FROM schema_migrations');
      console.log('✅ Migrations table exists with', migrationResult.rows[0].count, 'entries');
    } catch (error) {
      console.log('⚠️  Migrations table does not exist yet (this is normal for first run)');
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Make sure Docker is running: docker ps');
    console.error('2. Start PostgreSQL container: docker-compose up -d postgres');
    console.error('3. Check container logs: docker-compose logs postgres');
    console.error('4. Verify connection settings in .env file');
    process.exit(1);
  }
}

testConnection();