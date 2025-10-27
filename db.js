const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config();

// Parse the connection string and modify it for connection pooling
let connectionString = process.env.DATABASE_URL;

console.log('📊 Original DATABASE_URL host:', connectionString ? connectionString.split('@')[1]?.split('/')[0] : 'not set');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// If using Supabase in PRODUCTION, we need to use the pooler hostname to avoid IPv6 issues on Render
// In development (local), use the direct connection
const isProduction = process.env.NODE_ENV === 'production';

if (connectionString && connectionString.includes('supabase') && isProduction) {
  // Parse the connection string
  const config = parse(connectionString);
  
  console.log('🔍 Detected Supabase connection - Original host:', config.host);
  
  // Replace db.xxx.supabase.co with aws-0-[region].pooler.supabase.com (IPv4)
  // This avoids IPv6 connection issues on platforms like Render
  if (config.host && config.host.includes('db.') && config.host.includes('.supabase.co')) {
    // Use SUPABASE_REGION env var if set, otherwise default to us-east-1
    const region = process.env.SUPABASE_REGION || 'us-east-1';
    config.host = `aws-0-${region}.pooler.supabase.com`;
    config.port = '6543';
    
    // For Session mode (port 6543), keep username as 'postgres' (don't add project ref)
    // Transaction mode would need postgres.project_ref format, but we're using Session mode
    console.log(`🔄 Converting to pooler: ${config.host}:${config.port} (Session mode)`);
    console.log(`🔄 Username: ${config.user}`);
    
    // Reconstruct the connection string
    connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  } else if (config.host && config.host.includes('pooler.supabase.com')) {
    console.log('✓ Already using pooler hostname');
  } else {
    console.log('⚠️  Unknown Supabase hostname format:', config.host);
  }
  
  console.log('🔄 Using Supabase connection pooler (IPv4) in session mode');
} else if (connectionString && connectionString.includes('supabase')) {
  console.log('🏠 Development mode: Using direct Supabase connection (no pooler)');
} else {
  console.log('ℹ️  Not a Supabase connection or DATABASE_URL not set');
}

// Create a connection pool to Supabase PostgreSQL database
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

module.exports = pool;

