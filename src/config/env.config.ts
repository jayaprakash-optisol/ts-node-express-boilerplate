import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define environment variable schema with validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z
    .string()
    .transform(val => parseInt(val, 10))
    .default('86400'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z
    .string()
    .transform(val => parseInt(val, 10))
    .default('10'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_DB: z.string().default('0'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('5'),
  // Test Rate Limiting
  TEST_RATE_LIMIT_WINDOW_MS: z.string().default('1000'),
  TEST_RATE_LIMIT_MAX: z.string().default('3'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_FILE_PATH: z.string().default('logs/app.log'),

  // Encryption
  ENCRYPTION_KEY: z.string().default('default-encryption-key-change-in-production'),
  ENCRYPTION_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export default env;
