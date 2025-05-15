import express from 'express';

import { AuthController } from '../controllers/auth.controller';
import { authenticate, cacheMiddleware, validate } from '../middleware';
import { type AuthRequest } from '../types';
import { loginSchema, registerSchema } from '../validators';

const router = express.Router();
const authController = new AuthController();

// Cache configuration
const AUTH_CACHE_KEY = 'auth';
const AUTH_CACHE_TTL = 300; // 5 minutes
const authCacheOptions = { ttl: AUTH_CACHE_TTL, keyPrefix: 'api:auth' };

// POST /api/v1/auth/register - Register a new user
router.post('/register', validate(registerSchema), authController.register);

// POST /api/v1/auth/login - Login
router.post('/login', validate(loginSchema), authController.login);

// GET /api/v1/auth/me - Get current user (cached)
router.get(
  '/me',
  authenticate,
  cacheMiddleware(`${AUTH_CACHE_KEY}:me`, {
    ...authCacheOptions,
    // Custom key generator that includes user ID in the cache key
    keyGenerator: req => `user:${(req as AuthRequest).user?.id}`,
  }),
  authController.getCurrentUser,
);

// POST /api/v1/auth/refresh - Refresh token
router.post('/refresh', authenticate, authController.refreshToken);

export default router;
