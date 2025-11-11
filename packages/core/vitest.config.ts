import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseConfig, {
    // Core-specific overrides
    test: {
      // Database lifecycle management
      setupFiles: ['./vitest.setup.ts'],
      // Handle dynamic imports better for core package
      deps: {
        external: ['better-sqlite3'],
      },
      // Keep the existing timeout since core has longer-running tests
      testTimeout: 30000,
    },
  }),
);
