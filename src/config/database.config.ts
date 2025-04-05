import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import env from './env.config';
import { logger } from '../utils/logger';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Track if the pool is already closed
let isPoolClosed = false;

// Initialize Drizzle with the connection pool
export const db = drizzle(pool);

// Function to test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    logger.info('✅ PostgreSQL connected successfully');
    client.release();
  } catch (err: any) {
    logger.error(`❌ PostgreSQL connection error: ${err.message}`);
  }
};

// For explicitly closing the pool when the application shutdowns
export const closePool = async (): Promise<void> => {
  if (!isPoolClosed) {
    isPoolClosed = true;
    await pool.end();
    logger.info('Database connection pool closed');
  }
};
