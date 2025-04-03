import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: '.env' });

// Create a connection to the default database first
const adminPool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('/local_test', '/local'),
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pool for the test database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool);

beforeAll(async () => {
  try {
    // Try to create the test database if it doesn't exist
    try {
      const adminClient = await adminPool.connect();

      // Check if the test database exists
      const result = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = 'local_test'",
      );

      // If the database doesn't exist, create it
      if (result.rowCount === 0) {
        console.log('Creating test database: local_test');
        // Disconnect all existing connections to the database
        await adminClient.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = 'local_test'
          AND pid <> pg_backend_pid();
        `);
        await adminClient.query('CREATE DATABASE local_test');
      }

      adminClient.release();
    } catch (error) {
      console.error('Error setting up test database:', error);
    } finally {
      await adminPool.end();
    }

    // Connect to the test database and run migrations
    const client = await pool.connect();
    client.release();

    // Run migrations
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../src/database/migrations') });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  await pool.end();
});

export { db };
