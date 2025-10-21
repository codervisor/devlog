// Server-side only exports - DO NOT import on client side
// These include Prisma services and database utilities

// ============================================================================
// AGENT OBSERVABILITY (PRIMARY FEATURE)
// ============================================================================
// Export agent observability module for organized imports
export * from './agent-observability/index.js';

// ============================================================================
// PROJECT MANAGEMENT (SUPPORTING FEATURE)
// ============================================================================
// Export project management module for organized imports
export * from './project-management/index.js';

// ============================================================================
// LEGACY EXPORTS (backward compatibility)
// ============================================================================
// Direct service exports - still supported but prefer module imports above
export * from './services/index.js';

// Prisma configuration utilities
export * from './utils/prisma-config.js';