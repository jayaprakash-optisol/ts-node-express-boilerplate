import { createValidator } from '../utils/validator.util';
import { registerSchema, loginSchema, updateSchema } from './schemas/user.schema';

// Export validator middleware
export const validateRegisterUser = createValidator(registerSchema);
export const validateLoginUser = createValidator(loginSchema);
export const validateUpdateUser = createValidator(updateSchema);
