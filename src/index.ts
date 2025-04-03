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
  logger.info(`🚀 API documentation available at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('❌ Unhandled Rejection:', error);
  // Close server & exit process
  server.close(() => {
    logger.info('Server closed due to unhandled promise rejection');
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ Uncaught Exception:', error);
  // Close server & exit process
  server.close(() => {
    logger.info('Server closed due to uncaught exception');
    process.exit(1);
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Received shutdown signal. Closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    closePool()
      .then(() => {
        logger.info('All connections closed successfully');
        process.exit(0);
      })
      .catch(err => {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      });
  });

  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
