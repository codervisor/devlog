/**
 * Test setup utilities
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { resetIdCounter } from './factories.js';

/**
 * Global test setup that runs before each test
 */
export function setupTest() {
  beforeEach(() => {
    // Reset ID counter for consistent test IDs
    resetIdCounter();
  });

  afterEach(() => {
    // Clean up mocks
    vi.clearAllMocks();
  });
}

/**
 * Setup for integration tests
 */
export function setupIntegrationTest() {
  beforeEach(() => {
    resetIdCounter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
}

/**
 * Create a test environment with common setup
 */
export function createTestEnvironment() {
  const cleanup: Array<() => void | Promise<void>> = [];

  return {
    /**
     * Register a cleanup function
     */
    addCleanup(fn: () => void | Promise<void>): void {
      cleanup.push(fn);
    },

    /**
     * Run all cleanup functions
     */
    async cleanup(): Promise<void> {
      for (const fn of cleanup.reverse()) {
        await fn();
      }
      cleanup.length = 0;
    },
  };
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
}

// Re-export vitest utilities for convenience
export { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
