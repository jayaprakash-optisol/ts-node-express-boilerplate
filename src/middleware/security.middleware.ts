import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import env from '../config/env.config';

const CSP_POLICY =
  "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'";

/**
 * Rate limiting middleware for authentication endpoints
 * More restrictive than the global rate limit
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
  },
});

/**
 * Rate limiting middleware for user creation endpoints
 */
export const userCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 user creations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many user creation attempts, please try again later',
  },
});

/**
 * CORS configuration middleware
 * Controls which domains can access the API
 */
export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    // In production, only allow specific origins
    if (env.NODE_ENV === 'production') {
      const allowedOrigins = ['*'];

      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Content-Security-Policy middleware
 * Adds CSP headers to prevent XSS attacks
 */
export const contentSecurityPolicy = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  next();
};

/**
 * Prevent MIME type sniffing
 */
export const noSniff = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Enable cross-site scripting filter in browsers
 */
export const xssFilter = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

/**
 * Prevents click-jacking by restricting frame embedding
 */
export const frameGuard = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Set Strict-Transport-Security header to enforce HTTPS
 */
export const hsts = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

/**
 * Cache control middleware
 * Controls how responses are cached
 */
export const cacheControl = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply to GET requests
  if (req.method === 'GET') {
    // Cache public resources for 1 day
    if (req.path.startsWith('/api/v1/public')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      // No caching for API endpoints by default
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
  next();
};
