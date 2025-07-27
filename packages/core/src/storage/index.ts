/**
 * Storage Module - Core storage providers and configurations
 *
 * This module provides storage-related functionality:
 * - providers/: Main storage provider implementations (JSON, TypeORM)
 * - typeorm/: Database configuration and schemas
 * - shared/: Cross-provider utilities and shared logic
 *
 * Note: GitHub integration has been moved to ../integrations/
 */

// Re-export storage provider factory and main interface
export * from './storage-provider.js';

// Re-export all storage providers from the providers folder
export * from './providers/index.js';

// Re-export specialized modules
export * from './typeorm/index.js';
export * from './shared/index.js';
