import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base.js';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      name: 'cli',
    },
  }),
);
