import winston from 'winston';
import fs from 'fs';
import path from 'path';
import env from '../config/env.config';

// Ensure log directory exists
const logDir = path.dirname(env.LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define logger format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Create the logger
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'leaktrak-api' },
  transports: [
    // Write to all logs with level 'info' and below to logs/combined.log
    new winston.transports.File({
      filename: env.LOG_FILE_PATH,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// If we're not in production, log to the console as well
if (env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';
          return `${timestamp} ${level}: ${message} ${meta}`;
        }),
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
