import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Enable global test utilities
    globals: true,
    // Environment setup
    environment: 'node',
    // Include all test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Configure mock usage
    mockReset: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/database/scripts/**',
        'src/types/**',
        'src/index.ts',
        'src/config/env.ts',
        'src/utils/*.ts',
        'src/validators/*.ts',
        'src/docs/**',
        'src/models/**',
        'src/config/**',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    // Resolver for module resolution
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
