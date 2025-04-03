import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRegisterUser, validateUpdateUser } from '../validators/user.validator';

const router = Router();
const userController = new UserController();

router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);
router.post('/', authenticate, authorize('admin'), validateRegisterUser, userController.createUser);
router.put('/:id', authenticate, authorize('admin'), validateUpdateUser, userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

export default router;
