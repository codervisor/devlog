/**
 * Base class for Prisma services
 * 
 * Provides common functionality for all Prisma-based services:
 * - Singleton pattern with TTL-based cleanup
 * - Prisma client initialization with fallback mode
 * - Common initialization lifecycle
 * - Resource management and disposal
 * 
 * This eliminates code duplication across PrismaDevlogService, PrismaAuthService,
 * PrismaChatService, and other Prisma-based services.
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Interface for service instances with TTL
 */
interface ServiceInstance<T> {
  service: T;
  createdAt: number;
}

/**
 * Abstract base class for Prisma services
 */
export abstract class PrismaServiceBase {
  // Static properties for singleton management
  protected static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  
  // Instance properties
  protected prisma: PrismaClient | null = null;
  protected initPromise: Promise<void> | null = null;
  protected fallbackMode = true;
  protected prismaImportPromise: Promise<void> | null = null;

  protected constructor() {
    // Initialize Prisma imports lazily
    this.prismaImportPromise = this.initializePrismaClient();
  }

  /**
   * Initialize Prisma client with fallback handling
   */
  protected async initializePrismaClient(): Promise<void> {
    try {
      // Try to import Prisma client - will fail if not generated
      const prismaModule = await import('@prisma/client');
      const configModule = await import('../utils/prisma-config.js');
      
      if (prismaModule.PrismaClient && configModule.getPrismaClient) {
        this.prisma = configModule.getPrismaClient();
        this.fallbackMode = false;
        console.log(`[${this.constructor.name}] Prisma client initialized successfully`);
      }
    } catch (error) {
      // Prisma client not available - service will operate in fallback mode
      console.warn(`[${this.constructor.name}] Prisma client not available, operating in fallback mode:`, (error as Error).message);
      this.fallbackMode = true;
    }
  }

  /**
   * TTL-based instance cleanup for singleton pattern
   */
  protected static cleanupInstances<T>(instances: Map<any, ServiceInstance<T>>): void {
    const now = Date.now();
    for (const [key, instance] of instances.entries()) {
      if (now - instance.createdAt > this.TTL_MS) {
        instances.delete(key);
      }
    }
  }

  /**
   * Create or retrieve instance with TTL management
   */
  protected static getOrCreateInstance<T extends PrismaServiceBase>(
    instances: Map<any, ServiceInstance<T>>,
    key: any,
    factory: () => T
  ): T {
    const now = Date.now();
    
    // Clean up expired instances
    this.cleanupInstances(instances);

    let instance = instances.get(key);
    if (!instance) {
      instance = {
        service: factory(),
        createdAt: now,
      };
      instances.set(key, instance);
    }

    return instance.service;
  }

  /**
   * Initialize the service (template method pattern)
   */
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Alias for ensureInitialized (for consistency with different naming patterns)
   */
  async initialize(): Promise<void> {
    return this.ensureInitialized();
  }

  /**
   * Internal initialization method (template method)
   * Subclasses can override this to add specific initialization logic
   */
  protected async _initialize(): Promise<void> {
    // Wait for Prisma client initialization
    if (this.prismaImportPromise) {
      await this.prismaImportPromise;
    }

    try {
      if (!this.fallbackMode && this.prisma) {
        await this.prisma.$connect();
        await this.onPrismaConnected();
        console.log(`[${this.constructor.name}] Service initialized with database connection`);
      } else {
        await this.onFallbackMode();
        console.log(`[${this.constructor.name}] Service initialized in fallback mode`);
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to initialize:`, error);
      this.initPromise = null;
      if (!this.fallbackMode) {
        throw error;
      }
    }
  }

  /**
   * Hook called when Prisma client is successfully connected
   * Subclasses can override to add specific setup logic
   */
  protected async onPrismaConnected(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Hook called when service is running in fallback mode
   * Subclasses can override to add specific fallback setup logic
   */
  protected async onFallbackMode(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    try {
      await this.prisma?.$disconnect();
      
      // Subclasses should override to remove from their static instances map
      await this.onDispose();
    } catch (error) {
      console.error(`[${this.constructor.name}] Error during disposal:`, error);
    }
  }

  /**
   * Hook called during disposal for subclass-specific cleanup
   */
  protected async onDispose(): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override to remove from their static instances map
  }

  /**
   * Check if service is in fallback mode
   */
  protected get isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Get the Prisma client (may be null in fallback mode)
   */
  protected get prismaClient(): PrismaClient | null {
    return this.prisma;
  }
}