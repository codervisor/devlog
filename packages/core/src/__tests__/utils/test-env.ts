/**
 * Test Environment Setup
 *
 * Sets up the environment for testing before any entity imports happen.
 * This must be imported first in test files to ensure SQLite compatibility.
 */

// Set SQLite mode before any entity modules are loaded
process.env.DEVLOG_STORAGE_TYPE = 'sqlite';

// Re-export everything from test-database for convenience
export * from './test-database.js';
