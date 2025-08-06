/**
 * Core devlog types and interfaces
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
  /**
   * **New** - Work item has been created but not yet started
   * - Initial status for all new devlog entries
   * - Indicates work is ready to be picked up
   * - Use when: Creating a new task, feature, or bug report
   */
  | 'new'
  /**
   * **In Progress** - Work is actively being developed
   * - Developer/AI is actively working on the implementation
   * - Main development phase where code is being written
   * - Use when: Starting work, making changes, implementing features
   */
  | 'in-progress'
  /**
   * **Blocked** - Work is temporarily stopped due to dependencies or issues
   * - Cannot proceed until external dependencies are resolved
   * - Waiting for decisions, resources, or other work to complete
   * - Use when: Stuck waiting for external factors, need clarification, dependencies not ready
   */
  | 'blocked'
  /**
   * **In Review** - Work is complete and awaiting review/approval
   * - Implementation is finished and ready for human/peer review
   * - Code review, design review, or stakeholder approval phase
   * - Focus on quality, standards compliance, and design validation
   * - Use when: Pull request submitted, awaiting code review, design needs approval
   */
  | 'in-review'
  /**
   * **Testing** - Work has passed review and is being validated through testing
   * - Quality assurance, functional testing, or user acceptance testing
   * - Verifying the solution works correctly and meets requirements
   * - Can include automated testing, manual testing, or staging deployment
   * - Use when: Deployed to staging, running test suites, user acceptance testing
   */
  | 'testing'
  /**
   * **Done** - Work is completed successfully and delivered
   * - All requirements met, tested, and accepted
   * - Work is deployed/delivered and functioning as expected
   * - Final status for successfully completed work
   * - Use when: Feature is live, bug is fixed, task is completed and verified
   */
  | 'done'
  /**
   * **Cancelled** - Work was stopped and will not be completed
   * - Requirements changed, priorities shifted, or work became unnecessary
   * - Different from "done" - represents abandoned rather than completed work
   * - Use when: Feature cancelled, bug no longer relevant, task deprioritized permanently
   */
  | 'cancelled';

export type DevlogPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Categories for devlog notes - used to classify and organize different types of information
 *
 * **Usage Guidelines:**
 * - Choose the most specific category that matches your note's primary purpose
 * - Use `progress` for general updates and status changes
 * - Use `issue` for problems and `solution` for their resolutions
 * - Use `feedback` for external input and `idea` for suggestions
 *
 * @example
 * ```typescript
 * const note: DevlogNote = {
 *   id: 'note-1',
 *   timestamp: '2025-07-10T10:00:00Z',
 *   category: 'feedback',
 *   content: 'User reported that the save button is confusing'
 * };
 * ```
 */
export type DevlogNoteCategory =
  /**
   * **Progress** - Work progress updates, milestones, and status changes
   * - General updates on development progress
   * - Status transitions and milestone achievements
   * - Use for: Daily standup updates, completion of subtasks, general progress notes
   */
  | 'progress'
  /**
   * **Issue** - Problems encountered, bugs found, or obstacles discovered
   * - Technical problems, build failures, or unexpected behavior
   * - Blockers and challenges that need to be addressed
   * - Use for: Bug reports, technical difficulties, unexpected complications
   */
  | 'issue'
  /**
   * **Solution** - Solutions implemented, fixes applied, or workarounds found
   * - How problems were resolved or addressed
   * - Technical solutions and implementation details
   * - Use for: Bug fixes, problem resolutions, workaround implementations
   */
  | 'solution'
  /**
   * **Idea** - New ideas, suggestions, or potential improvements
   * - Enhancement suggestions and new feature ideas
   * - Alternative approaches or optimization opportunities
   * - Use for: Feature suggestions, improvement ideas, alternative implementations
   */
  | 'idea'
  /**
   * **Reminder** - Important reminders, action items, or follow-up tasks
   * - Things to remember for future work
   * - Follow-up actions and TODO items
   * - Use for: Technical debt items, future improvements, cleanup tasks
   */
  | 'reminder'
  /**
   * **Feedback** - External feedback from users, customers, stakeholders, or usability testing
   * - Input from users, customers, or stakeholders
   * - Results from usability testing or user research
   * - Use for: User feedback, stakeholder input, testing results, customer requests
   */
  | 'feedback'
  /**
   * **Acceptance Criteria** - Updates on acceptance criteria validation and completion status
   * - Tracking progress on specific acceptance criteria items
   * - Marking criteria as complete, in-progress, or blocked
   * - Use for: AC validation results, criteria check-offs, completion tracking
   */
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

export interface DevlogEntry {
  id?: DevlogId;
  key?: string; // Semantic key (e.g., "web-ui-issues-investigation")
  title: string;
  type: DevlogType;
  description: string;
  status: DevlogStatus;
  priority: DevlogPriority;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null; // ISO timestamp when status changed to 'done' or 'cancelled'
  assignee?: string | null;
  archived?: boolean; // For long-term management and performance
  projectId: number; // Project context for multi-project isolation - REQUIRED

  // Flattened context fields
  acceptanceCriteria?: string[];
  businessContext?: string | null;
  technicalContext?: string | null;

  // Related entities (loaded separately, not stored as JSON)
  notes?: DevlogNote[];
  dependencies?: Dependency[];
}

export interface Dependency {
  id: string;
  type: 'blocks' | 'blocked-by' | 'related-to' | 'parent-of' | 'child-of';
  description: string;
  externalId?: string; // For external systems like Jira, ADO, etc.
  targetDevlogId?: number; // For internal devlog relationships (hierarchical structure)
}

export interface DevlogFilter {
  /**
   * @deprecated
   */
  filterType?: FilterType; // New filter dimension for status grouping
  status?: DevlogStatus[];
  type?: DevlogType[];
  priority?: DevlogPriority[];
  assignee?: string | null;
  fromDate?: string;
  toDate?: string;
  search?: string;
  archived?: boolean; // Filter for archived status
  projectId?: number; // Filter by project context
  // Enhanced search options
  searchOptions?: SearchOptions;
}

/**
 * Enhanced search options for database-level search optimization
 */
export interface SearchOptions {
  /** Enable relevance scoring at database level */
  includeRelevance?: boolean;
  /** Enable field matching information */
  includeMatchedFields?: boolean;
  /** Enable highlighting of search terms */
  includeHighlights?: boolean;
  /** Minimum relevance threshold (0-1) */
  minRelevance?: number;
}

/**
 * Enhanced search result with database-calculated relevance scoring
 */
export interface SearchResult<T = DevlogEntry> {
  /** The original entry */
  entry: T;
  /** Database-calculated relevance score (0-1) */
  relevance: number;
  /** Fields that matched the search query */
  matchedFields: string[];
  /** Highlighted text excerpts (optional) */
  highlights?: Record<string, string>;
}

/**
 * Enhanced paginated search result with relevance scoring
 */
export interface SearchPaginatedResult<T = DevlogEntry> {
  /** Array of search results with relevance scoring */
  items: SearchResult<T>[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Search metadata */
  searchMeta: SearchMeta;
}

/**
 * Search metadata for performance and debugging
 */
export interface SearchMeta {
  /** Query that was executed */
  query: string;
  /** Time taken for search in milliseconds */
  searchTime: number;
  /** Total number of matches before pagination */
  totalMatches: number;
  /** Applied filters summary */
  appliedFilters?: Record<string, any>;
  /** Database engine used for search */
  searchEngine?: StorageType;
}

/**
 * Filter type for status-based filtering including aggregate categories
 * - Individual statuses: 'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
 * - Aggregate categories: 'total' (all), 'open' (new, in-progress, blocked, in-review, testing), 'closed' (done, cancelled)
 */
export type FilterType = DevlogStatus | 'total' | 'open' | 'closed';

export interface DevlogStats {
  totalEntries: number;
  openEntries: number; // Open = new, in-progress, blocked, in-review, testing
  closedEntries: number; // Closed = done, cancelled
  byStatus: Record<DevlogStatus, number>;
  byType: Record<DevlogType, number>;
  byPriority: Record<DevlogPriority, number>;
  averageCompletionTime?: number;
}

// Time series data for dashboard charts
export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)

  // Cumulative data (primary Y-axis) - shows total project progress over time
  totalCreated: number; // Running total of all created devlogs
  totalClosed: number; // Running total of closed devlogs (based on closedAt timestamp)

  // Snapshot data (secondary Y-axis) - shows workload at this point in time
  open: number; // Entries that were open as of this date (totalCreated - totalClosed)

  // Daily activity (for velocity insights) - events that occurred on this specific day
  dailyCreated: number; // Devlogs created on this specific day
  dailyClosed: number; // Devlogs closed on this specific day (done + cancelled)
}

export interface TimeSeriesStats {
  dataPoints: TimeSeriesDataPoint[];
  dateRange: {
    from: string;
    to: string;
  };
}

export interface TimeSeriesRequest {
  days?: number; // Number of days to look back (default: 30)
  from?: string; // Start date (ISO string)
  to?: string; // End date (ISO string)
  projectId: number;
}

// Pagination Support
export interface PaginationOptions {
  /** Current page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Offset for items to skip (alternative to page) */
  offset?: number;
  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  /** Array of items for current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total?: number;
  /** Total number of pages */
  totalPages?: number;
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
