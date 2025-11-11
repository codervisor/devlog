import { defineConfig } from 'vitest/config';
import type { ViteUserConfig as UserConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all packages in the monorepo
 */
export const baseConfig: UserConfig = {
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'build', 'dist'],
    testTimeout: 30000,
    // Better test isolation
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts', // Include all source files
        'app/**/*.ts', // Include app-specific files
      ],
      exclude: [
        'node_modules/',
        'build/',
        'dist/',
        'src/__tests__/**', // Exclude test files from coverage
        'src/types/**', // Exclude type definitions
        '**/index.ts', // Exclude barrel export files
        '**/*.d.ts', // Exclude TypeScript declaration files
        'src/config/**', // Configuration files
        'tmp/**', // Temporary files
      ],
      // Coverage thresholds (can be overridden per package)
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
  },
};

/**
 * Default configuration that can be used by packages
 */
export default defineConfig(baseConfig);
