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

// Test database connection
pool
  .connect()
  .then(async client => {
    logger.info('✅ PostgreSQL connected successfully');
    client.release();
  })
  .catch(err => {
    logger.error(`❌ PostgreSQL connection error: ${err.message}`);
  });

// Initialize Drizzle with the connection pool
export const db = drizzle(pool);

// For explicitly closing the pool when the application shutdowns
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Database connection pool closed');
};
