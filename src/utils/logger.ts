import winston from 'winston';
import fs from 'fs';
import path from 'path';
import env from '../config/env.config';

// Ensure log directory exists
const logDir = path.dirname(env.LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Clean console format
const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
  const msg = String(message).trim();
  return `${timestamp} ${level}: ${msg}`;
});

// File format (JSON for machine readability)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create the logger
export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'express-api' },
  transports: [
    // Write logs to file
    new winston.transports.File({
      filename: env.LOG_FILE_PATH,
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      level: env.LOG_LEVEL || 'info',
    }),
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Add console transport for development
if (env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.errors({ stack: false }), // No stack traces in console
        consoleFormat,
      ),
    }),
  );
}

// Create a stream object for Morgan
export const stream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
