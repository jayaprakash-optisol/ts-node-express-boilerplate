import http from 'http';
import app from './app';
import env from './config/env.config';
import { logger } from './utils/logger';
import { closePool } from './config/database.config';

// Create HTTP server
const server = http.createServer(app);

// Start server
const PORT = env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  console.log(`✅ Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`🚀 API documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🚀 API documentation available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown handler
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Close database connections
    await closePool();
    logger.info('Database connections closed');
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('❌ Unhandled Rejection:', reason);
  shutdown('Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ Uncaught Exception:', error);
  shutdown('Uncaught Exception');
});

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
