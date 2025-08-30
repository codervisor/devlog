/**
 * Test Environment Setup
 *
 * Sets up the environment for testing Prisma-based services.
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
