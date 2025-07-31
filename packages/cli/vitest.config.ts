import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      name: 'cli',
    },
  }),
);
