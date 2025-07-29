/**
 * Test setup file for Vitest
 * Configures global mocks and test environment
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js environment
global.window = global.window || {};
Object.defineProperty(global.window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock fetch for tests that don't explicitly mock it
global.fetch = vi.fn();

// Setup console mocking for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console.error and console.warn during tests unless explicitly needed
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;

  // Clear all mocks
  vi.clearAllMocks();
});
