/**
 * Core devlog types and interfaces
 *
 * These types define the structure of devlog entries (work items),
 * which are the primary units of work tracking in the system.
 */

/**
 * Storage engine types supported by the devlog system
 */
export type StorageType = 'postgres' | 'postgre' | 'mysql' | 'sqlite';

export type DevlogType = 'feature' | 'bugfix' | 'task' | 'refactor' | 'docs';

/**
 * Devlog status representing the current stage of work
 *
 * **Typical Workflow Progression:**
 * ```
 * new → in-progress → in-review → testing → done
 *                   ↓
 *                 blocked (can return to in-progress)
 *                   ↓
 *               cancelled (work stopped)
 * ```
 *
 * **Status Categories:**
 * - **Open Statuses** (active work): `new`, `in-progress`, `blocked`, `in-review`, `testing`
 * - **Closed Statuses** (completed work): `done`, `cancelled`
 */
export type DevlogStatus =
  | 'new'
  | 'in-progress'
  | 'blocked'
  | 'in-review'
  | 'testing'
  | 'done'
  | 'cancelled';

export type DevlogPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Categories for devlog notes - used to classify and organize different types of information
 */
export type DevlogNoteCategory =
  | 'progress'
  | 'issue'
  | 'solution'
  | 'idea'
  | 'reminder'
  | 'feedback'
  | 'acceptance-criteria';

/**
 * ID type for devlog entries - integer only for clean, user-friendly references
 */
export type DevlogId = number;

export interface DevlogNote {
  id: string;
  timestamp: string;
  category: DevlogNoteCategory;
  content: string;
}

/**
 * Document types supported by the devlog system
 */
export type DocumentType =
  | 'text'
  | 'markdown'
  | 'image'
  | 'pdf'
  | 'code'
  | 'json'
  | 'csv'
  | 'log'
  | 'config'
  | 'other';

/**
 * Document interface for files attached to devlog entries
 */
export interface DevlogDocument {
  id: string;
  devlogId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: DocumentType;
  content?: string;
  metadata?: Record<string, any>;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface DevlogEntry {
  id?: DevlogId;
  key?: string;
  title: string;
  type: DevlogType;
  description: string;
  status: DevlogStatus;
  priority: DevlogPriority;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  assignee?: string | null;
  archived?: boolean;
  projectId: number;

  // Flattened context fields
  acceptanceCriteria?: string[];
  businessContext?: string | null;
  technicalContext?: string | null;

  // Related entities (loaded separately)
  notes?: DevlogNote[];
  dependencies?: Dependency[];
  documents?: DevlogDocument[];
}

/**
 * Work Item - Industry-standard terminology for trackable work
 */
export type WorkItem = DevlogEntry;

export interface Dependency {
  id: string;
  type: 'blocks' | 'blocked-by' | 'related-to' | 'parent-of' | 'child-of';
  description: string;
  externalId?: string;
  targetDevlogId?: number;
}

export interface DevlogFilter {
  status?: DevlogStatus[];
  type?: DevlogType[];
  priority?: DevlogPriority[];
  assignee?: string | null;
  fromDate?: string;
  toDate?: string;
  search?: string;
  archived?: boolean;
  projectId?: number;
  searchOptions?: SearchOptions;
}

/**
 * Enhanced search options for database-level search optimization
 */
export interface SearchOptions {
  includeRelevance?: boolean;
  includeMatchedFields?: boolean;
  includeHighlights?: boolean;
  minRelevance?: number;
}

/**
 * Enhanced search result with database-calculated relevance scoring
 */
export interface SearchResult<T = DevlogEntry> {
  entry: T;
  relevance: number;
  matchedFields: string[];
  highlights?: Record<string, string>;
}
