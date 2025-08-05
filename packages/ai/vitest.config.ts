import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseConfig, {
    // AI-specific overrides
    test: {
      // AI package might not have tests yet, so pass with no tests
      passWithNoTests: true,
    },
  }),
);
