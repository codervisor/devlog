/**
 * Common mock utilities for testing
 */

import { vi } from 'vitest';

/**
 * Create a mock API client
 */
export function createMockApiClient() {
  return {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  };
}

/**
 * Create a mock database client
 */
export function createMockDatabaseClient() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockImplementation(async (callback) => {
      return await callback({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      });
    }),
  };
}

/**
 * Create a mock logger
 */
export function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Create a mock timer for testing time-dependent code
 */
export function createMockTimer() {
  let currentTime = Date.now();

  return {
    now: () => currentTime,
    advance: (ms: number) => {
      currentTime += ms;
    },
    set: (time: number) => {
      currentTime = time;
    },
    reset: () => {
      currentTime = Date.now();
    },
  };
}

/**
 * Wait for a promise to resolve or reject
 */
export async function waitFor(
  fn: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Mock implementation of setTimeout that can be controlled
 */
export function createMockSetTimeout() {
  const timers: Array<{
    callback: () => void;
    delay: number;
    id: number;
  }> = [];
  let nextId = 1;

  return {
    setTimeout: (callback: () => void, delay: number): number => {
      const id = nextId++;
      timers.push({ callback, delay, id });
      return id;
    },
    clearTimeout: (id: number): void => {
      const index = timers.findIndex((t) => t.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
      }
    },
    runAllTimers: (): void => {
      timers.forEach((timer) => timer.callback());
      timers.length = 0;
    },
    getTimerCount: (): number => timers.length,
  };
}

// Re-export vi from vitest for convenience
export { vi } from 'vitest';
