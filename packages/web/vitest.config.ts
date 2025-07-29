import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base.js';
import path from 'path';

export default defineConfig(
  mergeConfig(baseConfig, {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './app'),
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts', 'app/**/*.test.ts'],
      setupFiles: ['./tests/setup.ts'],
      env: {
        // Test environment variables
        NODE_ENV: 'test',
        DATABASE_URL: 'sqlite::memory:',
        TEST_API_URL: 'http://localhost:3201/api',
        TEST_PROJECT_ID: '1',
      },
    },
  }),
);
