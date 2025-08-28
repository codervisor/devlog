/**
 * Prisma Client Configuration
 *
 * Replaces TypeORM configuration with Prisma for better Next.js integration
 * 
 * NOTE: This configuration requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

// TODO: Uncomment after Prisma client generation
// import { PrismaClient } from '@prisma/client';
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
// TODO: Uncomment after Prisma client generation
// let prisma: PrismaClient | null = null;

/**
 * Parse database configuration from environment variables
 * Returns the appropriate DATABASE_URL for Prisma
 */
export function parsePrismaConfig(): PrismaConfig {
  // For Vercel, prefer direct connection URLs that bypass connection pooling
  // to avoid SASL authentication issues
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // Fall back to TypeORM-style environment variables for backward compatibility
    const postgresUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    const mysqlUrl = process.env.MYSQL_URL;
    const sqliteUrl = process.env.SQLITE_URL;
    const dbType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase();

    if (dbType === 'postgres' && postgresUrl) {
      databaseUrl = postgresUrl;
    } else if (dbType === 'mysql' && mysqlUrl) {
      databaseUrl = mysqlUrl;
    } else if (dbType === 'sqlite') {
      databaseUrl = sqliteUrl || 'file:./devlog.db';
    } else if (postgresUrl) {
      // Default to PostgreSQL if available
      databaseUrl = postgresUrl;
    } else if (mysqlUrl) {
      // Fall back to MySQL
      databaseUrl = mysqlUrl;
    } else {
      // Default to SQLite for local development
      databaseUrl = 'file:./devlog.db';
    }
  }

  if (!databaseUrl) {
    throw new Error(
      'No database configuration found. Please set DATABASE_URL or configure POSTGRES_URL/MYSQL_URL/SQLITE_URL environment variables.'
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
 * 
 * TODO: Uncomment after Prisma client generation
 */
export function getPrismaClient(): any {
  throw new Error('getPrismaClient: Requires Prisma client generation - run `npx prisma generate`');
  
  /* TODO: Uncomment after Prisma client generation
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
  */
}

/**
 * Disconnect Prisma Client
 * Useful for tests and cleanup
 */
export async function disconnectPrisma(): Promise<void> {
  // TODO: Uncomment after Prisma client generation
  /* 
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  */
}

/**
 * Health check for database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // TODO: Uncomment after Prisma client generation
    /*
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
    */
    
    // Placeholder for now
    return false;
  } catch (error) {
    console.error('[Prisma] Database connection failed:', error);
    return false;
  }
}

/**
 * Get database URL for the current environment
 * Useful for migrations and debugging
 */
export function getDatabaseUrl(): string {
  const config = parsePrismaConfig();
  return config.databaseUrl;
}