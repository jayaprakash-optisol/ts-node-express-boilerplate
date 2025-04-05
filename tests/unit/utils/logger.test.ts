import winston from 'winston';
import fs from 'fs';
import path from 'path';
import env from '../../../src/config/env.config';
import { logger, stream } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis(),
  };

  const mLogger = {
    add: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  return {
    format: mFormat,
    createLogger: jest.fn().mockReturnValue(mLogger),
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../../src/config/env.config', () => ({
  NODE_ENV: 'test',
  LOG_FILE_PATH: '/logs/app.log',
  LOG_LEVEL: 'info',
}));

describe('Logger Utility', () => {
  // Original environment values
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment values
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should create log directory if it does not exist', () => {
    // Setup
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Re-import to trigger the code
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../src/utils/logger');
    });

    // Assert
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(env.LOG_FILE_PATH), { recursive: true });
  });

  it('should not create log directory if it already exists', () => {
    // Setup
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Re-import to trigger the code
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../src/utils/logger');
    });

    // Assert
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should add console transport in non-production environment', () => {
    // Setup - already set to 'test' in the mock

    // Re-import to trigger the code
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../src/utils/logger');
    });

    // Assert
    expect(winston.createLogger).toHaveBeenCalled();
    expect(winston.transports.Console).toHaveBeenCalled();
    expect(logger.add).toHaveBeenCalled();
  });

  it('should not add console transport in production environment', () => {
    // Setup
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const envMock = require('../../../src/config/env.config') as typeof env;
    envMock.NODE_ENV = 'production';

    // Re-import to trigger the code
    jest.isolateModules(() => {
      const mockLogger = {
        add: jest.fn(),
      };
      (winston.createLogger as jest.Mock).mockReturnValue(mockLogger);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../src/utils/logger');

      // Assert
      expect(mockLogger.add).not.toHaveBeenCalled();
    });
  });

  it('should create the stream object with write method', () => {
    // Assert
    expect(stream).toBeDefined();
    expect(typeof stream.write).toBe('function');

    // Act
    stream.write('test message\n');

    // Assert
    expect(logger.info).toHaveBeenCalledWith('test message');
  });
});
