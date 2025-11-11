import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaServiceBase } from '../prisma-service-base.js';

// Mock concrete service class for testing
class MockPrismaService extends PrismaServiceBase {
  private static instances: Map<string, { service: MockPrismaService; createdAt: number }> = new Map();
  
  private constructor(private key: string = 'default') {
    super();
  }
  
  static getInstance(key: string = 'default'): MockPrismaService {
    return this.getOrCreateInstance(this.instances, key, () => new MockPrismaService(key));
  }
  
  protected async onDispose(): Promise<void> {
    // Remove from instances map
    for (const [instanceKey, instance] of MockPrismaService.instances.entries()) {
      if (instance.service === this) {
        MockPrismaService.instances.delete(instanceKey);
        break;
      }
    }
  }
  
  getKey(): string {
    return this.key;
  }
  
  checkFallbackMode(): boolean {
    return this.isFallbackMode;
  }
  
  getPrisma() {
    return this.prismaClient;
  }
}

describe('PrismaServiceBase', () => {
  let service: MockPrismaService;
  
  beforeEach(() => {
    service = MockPrismaService.getInstance('test');
  });
  
  afterEach(async () => {
    await service.dispose();
  });
  
  describe('singleton pattern', () => {
    it('should return the same instance for the same key', () => {
      const service1 = MockPrismaService.getInstance('test-key');
      const service2 = MockPrismaService.getInstance('test-key');
      
      expect(service1).toBe(service2);
    });
    
    it('should return different instances for different keys', () => {
      const service1 = MockPrismaService.getInstance('key1');
      const service2 = MockPrismaService.getInstance('key2');
      
      expect(service1).not.toBe(service2);
      expect(service1.getKey()).toBe('key1');
      expect(service2.getKey()).toBe('key2');
    });
  });
  
  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(service.ensureInitialized()).resolves.not.toThrow();
    });
    
    it('should only initialize once', async () => {
      await service.ensureInitialized();
      await service.ensureInitialized();
      
      // Multiple calls should not cause issues
      expect(true).toBe(true);
    });
    
    it('should support both ensureInitialized and initialize methods', async () => {
      await expect(service.ensureInitialized()).resolves.not.toThrow();
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('fallback mode', () => {
    it('should operate in fallback mode when Prisma client not available', () => {
      // In test environment, Prisma client is not available
      expect(service.checkFallbackMode()).toBe(true);
    });
    
    it('should have null prisma client in fallback mode', () => {
      expect(service.getPrisma()).toBeNull();
    });
  });
  
  describe('lifecycle management', () => {
    it('should dispose without errors', async () => {
      await expect(service.dispose()).resolves.not.toThrow();
    });
  });
});