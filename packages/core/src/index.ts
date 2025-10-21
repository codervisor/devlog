// ============================================================================
// CLIENT-SAFE EXPORTS
// ============================================================================
// These exports are safe for both client and server environments

// Utilities (safe for client-side)
export * from './utils/index.js';

// Types (safe for client-side)
export * from './types/index.js';

// Validation (safe for client-side)
export * from './validation/index.js';

// ============================================================================
// SERVER-ONLY EXPORTS
// ============================================================================
// NOTE: Services and Prisma-related code are NOT exported here to prevent
// client-side import issues. For server-side code, import from:
//
// RECOMMENDED (organized by feature):
//   import { ... } from '@codervisor/devlog-core/server'
//   - Then use: AgentEventService, AgentSessionService (agent observability)
//   - Or use: PrismaProjectService, PrismaDevlogService (project management)
//
// See server.ts for organized module exports (agent-observability, project-management)

