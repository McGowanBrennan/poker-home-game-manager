const { Pool } = require('pg');
require('dotenv').config();

// Parse the connection string and modify it for connection pooling
let connectionString = process.env.DATABASE_URL;

// If using Supabase, switch from port 5432 to 6543 for connection pooling
// This uses IPv4 and avoids IPv6 connection issues on platforms like Render
if (connectionString && connectionString.includes('supabase')) {
  connectionString = connectionString.replace(':5432', ':6543');
  // Add pooler mode parameter
  if (!connectionString.includes('?')) {
    connectionString += '?pgbouncer=true';
  } else if (!connectionString.includes('pgbouncer')) {
    connectionString += '&pgbouncer=true';
  }
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

