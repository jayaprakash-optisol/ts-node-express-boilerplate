import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { IUserService, IAuthService } from '../types/interfaces';

/**
 * Simple dependency injection container
 */
class Container {
  private services: Map<string, unknown>;

  constructor() {
    this.services = new Map();
  }

  /**
   * Register a service in the container
   * @param name Service name
   * @param instance Service instance
   */
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Resolve a service from the container
   * @param name Service name
   * @returns Service instance
   */
  resolve<T>(name: string): T {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }

    return service as T;
  }
}

// Create container instance
const container = new Container();

// Register services
const userService: IUserService = new UserService();
const authService: IAuthService = new AuthService(userService);

container.register('userService', userService);
container.register('authService', authService);

export default container;
