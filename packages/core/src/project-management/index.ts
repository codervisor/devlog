/**
 * Project Management Module
 * 
 * **SUPPORTING FEATURE - Optional project and work tracking**
 * 
 * This module provides optional project organization and work item tracking
 * features. These are supporting capabilities that help contextualize the
 * primary agent observability functionality.
 * 
 * **Key Components:**
 * - Project organization and metadata
 * - Work item tracking (features, bugs, tasks)
 * - Document management
 * - Note-taking and progress updates
 * 
 * **Relationship to Agent Observability:**
 * Projects provide containers for organizing agent sessions by codebase.
 * Work items provide optional structure for linking agent sessions to
 * planned development tasks.
 * 
 * **Terminology Note:**
 * "Work item" is the preferred term (industry standard), but "devlog entry"
 * remains fully supported for backward compatibility.
 * 
 * @module project-management
 * @category Project Management
 * 
 * @example
 * ```typescript
 * import { 
 *   PrismaProjectService,
 *   PrismaDevlogService,
 *   WorkItem,
 *   Project
 * } from '@codervisor/devlog-core/project-management';
 * 
 * // Create a project
 * const projectService = PrismaProjectService.getInstance();
 * await projectService.initialize();
 * const project = await projectService.create({
 *   name: 'my-app',
 *   description: 'Main application'
 * });
 * 
 * // Create a work item (optional)
 * const workItemService = PrismaDevlogService.getInstance(project.id);
 * await workItemService.initialize();
 * const item = await workItemService.create({
 *   title: 'Implement auth',
 *   type: 'feature',
 *   status: 'new'
 * });
 * ```
 */

// ============================================================================
// Services - Project and Work Item Management
// ============================================================================

/**
 * Re-export project management services from their organized locations
 */
export { PrismaProjectService } from './projects/index.js';
export { PrismaDevlogService } from './work-items/index.js';
export { PrismaDocumentService } from './documents/index.js';
export { PrismaChatService } from './chat/index.js';
export { HierarchyService } from './hierarchy/index.js';
export type {
  WorkspaceContext,
  MachineCreateInput,
  WorkspaceCreateInput,
  ProjectHierarchy,
} from './hierarchy/index.js';

// ============================================================================
// Types - Project Management Data Structures
// ============================================================================

/**
 * Re-export project management types
 */
export type {
  // Project types
  Project,
  
  // Work item types (preferred) and DevlogEntry (legacy)
  WorkItem,              // ⭐ Preferred - use this in new code
  DevlogEntry,           // ⚠️ Legacy - still supported for backward compatibility
  DevlogId,
  DevlogType,
  DevlogStatus,
  DevlogPriority,
  DevlogNote,
  DevlogNoteCategory,
  DevlogDocument,
  DocumentType,
  Dependency,
  
  // Filters and queries
  DevlogFilter,
  SearchOptions,
  SearchResult,
  SearchMeta,
  SearchPaginatedResult,
  
  // Statistics
  DevlogStats,
  TimeSeriesRequest,
  TimeSeriesDataPoint,
  TimeSeriesStats,
  
  // Pagination
  PaginatedResult,
  PaginationMeta,
  SortOptions,
} from '../types/index.js';
