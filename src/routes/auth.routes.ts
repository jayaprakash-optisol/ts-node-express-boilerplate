import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, userCreationRateLimiter } from '../middleware/rate-limiter';
import { validateRegisterUser, validateLoginUser } from '../validators/user.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', userCreationRateLimiter, validateRegisterUser, authController.register);
router.post('/login', authRateLimiter, validateLoginUser, authController.login);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/refresh-token', authenticate, authController.refreshToken);

export default router;
