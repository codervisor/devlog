/**
 * Vitest setup file for @codervisor/devlog-core
 *
 * Sets up database lifecycle management for tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@codervisor/test-utils';
import type { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase(prisma);
});

afterAll(async () => {
  await teardownTestDatabase();
});
