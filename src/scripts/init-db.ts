// src/scripts/init-db.ts
import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

const initializeDatabase = async () => {
  try {
    // Read SQL schema file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../schema.sql'),
      'utf8'
    );

    // Connect to database
    const client = await pool.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Execute schema SQL
      await client.query(schemaSQL);

      // Commit transaction
      await client.query('COMMIT');

      console.log('Database schema initialized successfully');
    } catch (err) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
  }
};

// Run initialization
initializeDatabase();