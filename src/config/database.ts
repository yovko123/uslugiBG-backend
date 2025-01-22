// src/config/database.ts
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Log environment variables (remove in production)
console.log('Database Configuration:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  // Don't log the actual password
  passwordProvided: !!process.env.DB_PASSWORD
});

const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres', // Fallback to default
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'uslugibg',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create pool with explicit configuration
export const pool = new Pool({
  ...poolConfig,
  ssl: false // Explicitly disable SSL for local development
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection function
export const testConnection = async () => {
  let client;
  try {
    console.log('Attempting to connect to database...');
    client = await pool.connect();
    console.log('Successfully connected to database');
    
    const result = await client.query('SELECT current_database(), current_user');
    console.log('Database info:', result.rows[0]);
    
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
  }
};

// Initialize connection
if (require.main === module) {
  testConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}