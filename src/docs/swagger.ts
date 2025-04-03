import swaggerJSDoc from 'swagger-jsdoc';
import { version } from '../../package.json';
import env from '../config/env.config';

/**
 * Base definitions for API documentation
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'LeakTrak API Documentation',
    version,
    description: 'Enterprise-level API documentation for the LeakTrak application',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'LeakTrak Support',
      url: 'https://leaktrak.com',
      email: 'support@leaktrak.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
      description: 'Development Server',
    },
    {
      url: `https://api.leaktrak.com${env.API_PREFIX}`,
      description: 'Production Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'integer',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          firstName: {
            type: 'string',
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            description: 'User last name',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            description: 'User role',
          },
          isActive: {
            type: 'boolean',
            description: 'User account status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp',
          },
        },
      },
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication information is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Unauthorized',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient privileges',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Insufficient permissions to access this resource',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Resource not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error:
                'email: Invalid email format, password: Password must be at least 6 characters',
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Internal server error',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
  ],
};

/**
 * Options for the swagger docs
 */
const options = {
  swaggerDefinition,
  apis: ['./src/docs/**/*.yaml'],
};

/**
 * Initialize swagger-jsdoc
 */
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
