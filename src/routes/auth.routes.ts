import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { apiRateLimiter } from '../middleware/rate-limiter';
import { validateRegisterUser, validateLoginUser } from '../validators/user.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', apiRateLimiter, validateRegisterUser, authController.register);
router.post('/login', apiRateLimiter, validateLoginUser, authController.login);
router.get('/me', apiRateLimiter, authenticate, authController.getCurrentUser);
router.post('/refresh-token', apiRateLimiter, authenticate, authController.refreshToken);

export default router;
