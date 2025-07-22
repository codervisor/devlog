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
export * from './storage-provider.js';

// Re-export all storage providers from the providers folder
export * from './providers/index.js';

// Re-export specialized modules
export * from './github/index.js';
export * from './typeorm/index.js';
export * from './shared/index.js';
