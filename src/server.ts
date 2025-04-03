import app from './app';
import env from './config/env.config';
import { logger } from './utils/logger';
import { closeRedisConnections } from './utils/redis.util';

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
});

// Handle graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
    // Close server first to stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Redis connections
    await closeRedisConnections();

    // Exit process
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('Unhandled Rejection');
});
