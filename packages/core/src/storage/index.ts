/**
 * Storage Module - Organized storage providers and configurations
 *
 * This module provides a clean organization of storage-related functionality:
 * - providers/: Main storage provider implementations
 * - github/: GitHub-specific utilities and integrations
 * - typeorm/: Database configuration and schemas
 * - shared/: Cross-provider utilities and shared logic
 * - json/: Future JSON-specific utilities (placeholder)
 */

// Re-export storage provider factory and main interface
export * from './storage-provider';

// Re-export all storage providers from the providers folder
export * from './providers';

// Re-export specialized modules
export * from './github';
export * from './typeorm';
export * from './shared';
