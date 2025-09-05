const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'sativarisisv25',
    database: process.env.DB_NAME || 'sativar_isis',
  });

  try {
    console.log('🔄 Testando conexão com PostgreSQL...');
    
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Timestamp do banco:', result.rows[0].now);
    
    // Testar se as tabelas existem
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Tabelas encontradas:', tables.rows.map(r => r.table_name));
    
    client.release();
    await pool.end();
    
    console.log('✅ Teste concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    process.exit(1);
  }
}

testConnection();