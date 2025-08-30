/**
 * Service Migration Utility
 * 
 * Provides feature flag support for gradual migration from TypeORM to Prisma services.
 * This allows safe, incremental migration with fallback to TypeORM when Prisma client is unavailable.
 */

export interface ServiceMigrationConfig {
  /** Enable Prisma services when available (default: false for safety) */
  enablePrisma: boolean;
  /** Specific services to migrate (if not specified, migrates all when enablePrisma is true) */
  migrateServices?: string[];
  /** Fallback to TypeORM on Prisma errors (default: true for safety) */
  fallbackOnError: boolean;
}

/**
 * Get service migration configuration from environment variables
 */
export function getServiceMigrationConfig(): ServiceMigrationConfig {
  const enablePrisma = process.env.ENABLE_PRISMA_SERVICES === 'true';
  const migrateServices = process.env.MIGRATE_SERVICES?.split(',').map(s => s.trim());
  const fallbackOnError = process.env.FALLBACK_ON_ERROR !== 'false'; // Default to true

  return {
    enablePrisma,
    migrateServices,
    fallbackOnError,
  };
}

/**
 * Check if a specific service should use Prisma
 */
export function shouldUsePrisma(serviceName: string): boolean {
  const config = getServiceMigrationConfig();
  
  if (!config.enablePrisma) {
    return false;
  }
  
  // If specific services are configured, only migrate those
  if (config.migrateServices && config.migrateServices.length > 0) {
    return config.migrateServices.includes(serviceName);
  }
  
  // Otherwise, migrate all services when enablePrisma is true
  return true;
}

/**
 * Error wrapper for Prisma service calls with fallback
 */
export async function withPrismaFallback<T>(
  serviceName: string,
  prismaCall: () => Promise<T>,
  typeormCall: () => Promise<T>
): Promise<T> {
  const config = getServiceMigrationConfig();
  
  // If Prisma is not enabled for this service, use TypeORM
  if (!shouldUsePrisma(serviceName)) {
    return typeormCall();
  }
  
  try {
    return await prismaCall();
  } catch (error) {
    // Check if this is a "Prisma client not generated" error
    const isPrismaClientError = error instanceof Error && 
      error.message.includes('Prisma client generation');
    
    if (isPrismaClientError && config.fallbackOnError) {
      console.warn(`[${serviceName}] Prisma client not available, falling back to TypeORM:`, error.message);
      return typeormCall();
    }
    
    // For other errors, decide based on fallback configuration
    if (config.fallbackOnError) {
      console.error(`[${serviceName}] Prisma error, falling back to TypeORM:`, error);
      return typeormCall();
    }
    
    // Re-throw error if fallback is disabled
    throw error;
  }
}

/**
 * Service factory that returns the appropriate service implementation
 */
export class ServiceFactory {
  /**
   * Get the appropriate project service implementation
   */
  static getProjectService() {
    if (shouldUsePrisma('ProjectService')) {
      try {
        // Dynamic import to avoid import errors when Prisma client is not available
        const { PrismaProjectService } = require('../services/prisma-project-service.js');
        return PrismaProjectService.getInstance();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[ServiceFactory] PrismaProjectService not available, using TypeORM:', errorMessage);
      }
    }
    
    // Fallback to TypeORM
    const { ProjectService } = require('../services/project-service.js');
    return ProjectService.getInstance();
  }

  /**
   * Get the appropriate devlog service implementation
   */
  static getDevlogService(projectId: number) {
    if (shouldUsePrisma('DevlogService')) {
      try {
        // Dynamic import to avoid import errors when Prisma client is not available
        const { PrismaDevlogService } = require('../services/prisma-devlog-service.js');
        return PrismaDevlogService.getInstance(projectId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[ServiceFactory] PrismaDevlogService not available, using TypeORM:', errorMessage);
      }
    }
    
    // Fallback to TypeORM
    const { DevlogService } = require('../services/devlog-service.js');
    return DevlogService.getInstance(projectId);
  }

  /**
   * Get the appropriate auth service implementation
   */
  static getAuthService() {
    if (shouldUsePrisma('AuthService')) {
      try {
        // Dynamic import to avoid import errors when Prisma client is not available
        const { PrismaAuthService } = require('../services/prisma-auth-service.js');
        return PrismaAuthService.getInstance();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[ServiceFactory] PrismaAuthService not available, using TypeORM:', errorMessage);
      }
    }
    
    // Fallback to TypeORM
    const { AuthService } = require('../services/auth-service.js');
    return AuthService.getInstance();
  }

  /**
   * Get the chat service implementation (Prisma-only, new service)
   */
  static getChatService() {
    if (shouldUsePrisma('ChatService')) {
      try {
        // Dynamic import to avoid import errors when Prisma client is not available
        const { PrismaChatService } = require('../services/prisma-chat-service.js');
        return PrismaChatService.getInstance();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[ServiceFactory] PrismaChatService not available:', errorMessage);
        throw new Error('ChatService requires Prisma client - run `npx prisma generate`');
      }
    }
    
    throw new Error('ChatService is only available with Prisma - set ENABLE_PRISMA_SERVICES=true');
  }
}