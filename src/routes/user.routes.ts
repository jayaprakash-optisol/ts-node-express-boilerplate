import express from 'express';

import { UserController } from '../controllers/user.controller';
import { authenticate, authorize, cacheMiddleware, clearCache } from '../middleware';
import { validateRegisterUser, validateUpdateUser } from '../validators';

const router = express.Router();
const userController = new UserController();

// Cache configuration
const USER_CACHE_KEY = 'users';
const USER_CACHE_TTL = 600; // 10 minutes
const userCacheOptions = { ttl: USER_CACHE_TTL, keyPrefix: 'api:user' };

// GET /api/v1/users - Get all users with pagination (cached)
router.get(
  '/',
  authenticate,
  cacheMiddleware(USER_CACHE_KEY, userCacheOptions),
  userController.getAllUsers,
);

// GET /api/v1/users/:id - Get user by ID (cached)
router.get(
  '/:id',
  authenticate,
  cacheMiddleware(`${USER_CACHE_KEY}:detail`, userCacheOptions),
  userController.getUserById,
);

// POST /api/v1/users - Create a new user (clear cache after)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateRegisterUser,
  userController.createUser,
  clearCache('api:user*'), // Clear all user-related cache
);

// PUT /api/v1/users/:id - Update user (clear cache after)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateUpdateUser,
  userController.updateUser,
  clearCache('api:user*'), // Clear all user-related cache
);

// DELETE /api/v1/users/:id - Delete user (clear cache after)
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  userController.deleteUser,
  clearCache('api:user*'), // Clear all user-related cache
);

export default router;
