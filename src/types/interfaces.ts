import {
  User,
  NewUser,
  ServiceResponse,
  PaginationParams,
  PaginatedResult,
  JwtPayload,
} from './index';

/**
 * User service interface
 */
export interface IUserService {
  /**
   * Create a new user
   */
  createUser(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<User>>;

  /**
   * Get user by ID
   */
  getUserById(userId: number): Promise<ServiceResponse<User>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<ServiceResponse<User>>;

  /**
   * Get all users with pagination
   */
  getAllUsers(
    pagination: PaginationParams,
  ): Promise<ServiceResponse<PaginatedResult<Omit<User, 'password'>>>>;

  /**
   * Update user
   */
  updateUser(
    userId: number,
    userData: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ServiceResponse<User>>;

  /**
   * Delete user
   */
  deleteUser(userId: number): Promise<ServiceResponse<void>>;

  /**
   * Verify user password
   */
  verifyPassword(email: string, password: string): Promise<ServiceResponse<User>>;
}

/**
 * Auth service interface
 */
export interface IAuthService {
  /**
   * Register a new user
   */
  register(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<Omit<User, 'password'>>>;

  /**
   * Login user
   */
  login(email: string, password: string): Promise<ServiceResponse<{ user: User; token: string }>>;

  /**
   * Refresh token
   */
  refreshToken(userId: number): Promise<ServiceResponse<{ token: string }>>;
}

/**
 * JWT utility interface
 */
export interface IJwtUtil {
  /**
   * Generate a JWT token
   */
  generateToken(payload: JwtPayload): string;

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): ServiceResponse<JwtPayload>;

  /**
   * Decode a JWT token without verification
   */
  decodeToken(token: string): JwtPayload | null;
}
