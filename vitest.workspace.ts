import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace configuration for the devlog monorepo
 * This allows running tests across all packages from the root
 */
export default defineWorkspace([
  // Include all packages with tests
  'packages/core',
  'packages/mcp',
  'packages/ai',
  // Add web package when it gets tests
  // 'apps/web',
]);
