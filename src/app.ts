import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import env from './config/env.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import {
  corsOptions,
  contentSecurityPolicy,
  noSniff,
  xssFilter,
  frameGuard,
  hsts,
  cacheControl,
} from './middleware/security.middleware';
import { apiRateLimiter } from './middleware/rate-limiter';
import { stream } from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger';
import { HealthService } from './services/health.service';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

class App {
  public app: Application;
  private readonly healthService: HealthService;

  constructor() {
    this.app = express();
    this.healthService = new HealthService();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS with custom options
    this.app.use(cors(corsOptions));

    // Additional security headers
    this.app.use(contentSecurityPolicy);
    this.app.use(noSniff);
    this.app.use(xssFilter);
    this.app.use(frameGuard);
    this.app.use(hsts);
    this.app.use(cacheControl);

    // Request parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', { stream }));

    // Global rate limiting with Redis
    this.app.use(apiRateLimiter);
  }

  private configureRoutes(): void {
    // API routes
    this.app.use(`${env.API_PREFIX}/auth`, authRoutes);
    this.app.use(`${env.API_PREFIX}/users`, userRoutes);

    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Expose Swagger JSON
    this.app.get('/api-docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Health check
    this.app.get('/health', async (_req: Request, res: Response) => {
      try {
        const healthData = await this.healthService.checkHealth();
        const statusCode = healthData.components.redis.status === 'UP' ? 200 : 503;
        res.status(statusCode).json(healthData);
      } catch (error) {
        // If health check fails completely, report service unavailable
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(503).json({
          status: 'DOWN',
          timestamp: new Date().toISOString(),
          error: errorMessage,
        });
      }
    });
  }

  private configureErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Error handler
    this.app.use(errorHandler);
  }
}

export default new App().app;
