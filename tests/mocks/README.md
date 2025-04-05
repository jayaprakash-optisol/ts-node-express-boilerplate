# Test Mocks

This directory contains all test mocks and setup files in a simple, well-organized structure.

## Files

- `index.ts` - All mock data and utility functions organized by category
- `mocks.ts` - Re-exports everything from index.ts for backward compatibility
- `jest-setup.ts` - Global Jest setup loaded via jest.config.ts
- `test-hooks.ts` - Common test setup hooks for use in test files

## Usage

Simply import what you need directly from the mocks directory:

```typescript
// Import only what you need
import { mockUsers, mockRequest, agent } from '../mocks';
```

For test setup, use the hooks in your test files:

```typescript
import { setupBasicTests } from '../mocks/test-hooks';

// Setup test hooks
setupBasicTests();

describe('My Test Suite', () => {
  // Your tests...
});
```

## Organization

The mocks in `index.ts` are organized into well-commented sections:

- **Mock Data** - Mock users, tokens, and data factory functions
- **Request/Response Mocks** - Express request/response mocking utilities
- **Database Mocks** - Database connection mocks, Drizzle ORM mocks
- **Integration Test Mocks** - Supertest agent and utilities for integration tests
