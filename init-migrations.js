const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'sativarisisv25',
  database: process.env.DB_NAME || 'sativar_isis',
});

async function runMigrations() {
  console.log('🚀 Starting database migration process...');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    
    // Ensure migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Migrations table ready');
    
    // Get applied migrations
    const appliedResult = await pool.query('SELECT version FROM schema_migrations');
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.version));
    
    // Get available migration files
    const migrationsDir = path.join(__dirname, 'services/database/migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    let migrationsApplied = 0;
    
    for (const file of migrationFiles) {
      const version = path.basename(file, '.sql');
      
      if (appliedMigrations.has(version)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }
      
      console.log(`🔄 Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied migration: ${file}`);
        migrationsApplied++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${file}:`, error.message);
        throw error;
      } finally {
        client.release();
      }
    }
    
    if (migrationsApplied === 0) {
      console.log('✅ Database is already up to date.');
    } else {
      console.log(`✅ Successfully applied ${migrationsApplied} new migration(s).`);
    }
    
    console.log('🎉 Migration process completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };