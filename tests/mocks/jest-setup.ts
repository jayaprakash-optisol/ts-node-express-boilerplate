import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set global timeout for tests
jest.setTimeout(10000);

// Mock console methods to avoid polluting test output
global.console = {
  ...console,
  // Don't log in tests unless explicitly testing logs
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
