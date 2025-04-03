import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from 'dotenv';
import path from 'path';

config({ path: '.env.test' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool);

beforeAll(async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    client.release();

    // Run migrations
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../src/database/migrations') });
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  await pool.end();
});

export { db };
