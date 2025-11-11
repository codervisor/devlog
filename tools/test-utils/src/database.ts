/**
 * Database utilities for test setup and cleanup
 */

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * Setup test database connection
 * Creates a singleton PrismaClient for test use
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/devlog_test',
        },
      },
    });
    await testPrisma.$connect();
  }
  return testPrisma;
}

/**
 * Clean all data from the database
 * Deletes in correct order to respect foreign key constraints
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in order that respects foreign key constraints
  await prisma.$transaction([
    // Chat and messaging
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),

    // Agent observability
    prisma.agentEvent.deleteMany(),
    prisma.agentSession.deleteMany(),

    // Devlog system
    prisma.devlogDocument.deleteMany(),
    prisma.devlogNote.deleteMany(),
    prisma.devlogDependency.deleteMany(),
    prisma.devlogEntry.deleteMany(),

    // Project hierarchy
    prisma.workspace.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.project.deleteMany(),

    // Authentication
    prisma.emailVerificationToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.userProvider.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * Teardown test database connection
 * Disconnects and cleans up the PrismaClient instance
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Get the current test database instance
 * Throws error if not initialized
 */
export function getTestDatabase(): PrismaClient {
  if (!testPrisma) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.'
    );
  }
  return testPrisma;
}
