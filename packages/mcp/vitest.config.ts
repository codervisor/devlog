import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseConfig, {
    // MCP-specific overrides
    test: {
      // Add any MCP-specific test configuration here
      // For example, if you need different timeout:
      // testTimeout: 45000,
    },
  }),
);
