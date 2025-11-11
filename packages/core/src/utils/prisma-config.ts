/**
 * Prisma Client Configuration
 *
 * Simple configuration that uses DATABASE_URL as the single source of truth
 * for database connections. Supports PostgreSQL, MySQL, and SQLite.
 *
 * Examples:
 * - PostgreSQL: DATABASE_URL="postgresql://user:password@localhost:5432/devlog"
 * - MySQL: DATABASE_URL="mysql://user:password@localhost:3306/devlog"
 * - SQLite: DATABASE_URL="file:./devlog.db"
 */

import { PrismaClient } from '@prisma/client';
import { loadRootEnv } from './env-loader.js';

loadRootEnv();

/**
 * Prisma configuration options for different environments
 */
export interface PrismaConfig {
  databaseUrl: string;
  logLevel?: ('info' | 'query' | 'warn' | 'error')[];
  errorFormat?: 'pretty' | 'colorless' | 'minimal';
}

/**
 * Global Prisma Client instance with singleton pattern
 * Prevents multiple instances in development hot reloading
 */
let prisma: PrismaClient | null = null;

/**
 * Parse database configuration from environment variables
 * Uses only DATABASE_URL as the single source of truth
 */
export function parsePrismaConfig(): PrismaConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required. Please set DATABASE_URL in your .env file.',
    );
  }

  // Configure logging based on environment
  const logLevel: ('info' | 'query' | 'warn' | 'error')[] = [];

  if (process.env.NODE_ENV === 'development') {
    logLevel.push('warn', 'error');

    // Enable query logging in development if explicitly requested
    if (process.env.PRISMA_QUERY_LOG === 'true') {
      logLevel.push('query');
    }
  } else {
    // Production: only log warnings and errors
    logLevel.push('warn', 'error');
  }

  return {
    databaseUrl,
    logLevel,
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  };
}

/**
 * Get or create Prisma Client instance
 * Uses singleton pattern to prevent multiple instances
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const config = parsePrismaConfig();

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: config.logLevel,
    errorFormat: config.errorFormat,
  });

  // Handle cleanup on process termination
  const cleanup = async () => {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', cleanup);

  return prisma;
}

/**
 * Disconnect Prisma Client
 * Useful for tests and cleanup
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Prisma] Database connection failed:', error);
    return false;
  }
}

/**
 * Get database URL for the current environment
 * Returns the DATABASE_URL environment variable
 */
export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return databaseUrl;
}
