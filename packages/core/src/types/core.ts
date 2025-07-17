/**
 * Core devlog types and interfaces
 */

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
export type NoteCategory =
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
  | 'feedback';

/**
 * ID type for devlog entries - integer only for clean, user-friendly references
 */
export type DevlogId = number;

export interface DevlogNote {
  id: string;
  timestamp: string;
  category: NoteCategory;
  content: string;
  files?: string[];
  codeChanges?: string;
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
  closedAt?: string; // ISO timestamp when status changed to 'done' or 'cancelled'
  assignee?: string;
  notes: DevlogNote[];
  files?: string[];
  relatedDevlogs?: string[];
  archived?: boolean; // For long-term management and performance

  // Enhanced AI agent context
  context?: DevlogContext;

  // AI-specific context for cross-session persistence
  aiContext?: AIContext;

  // Enterprise tool integration (optional for now)
  externalReferences?: ExternalReference[];
}

export interface DevlogContext {
  // What problem this solves or what goal it achieves
  businessContext?: string;

  // Technical context - architecture decisions, constraints, assumptions
  technicalContext?: string;

  // Dependencies on other work items or external factors
  dependencies?: Dependency[];

  // Key decisions made and their rationale
  decisions?: Decision[];

  // Acceptance criteria or definition of done
  acceptanceCriteria?: string[];

  // Risks and mitigation strategies
  risks?: Risk[];
}

export interface Dependency {
  id: string;
  type: 'blocks' | 'blocked-by' | 'related-to';
  description: string;
  externalId?: string; // For Jira, ADO, etc.
}

export interface Decision {
  id: string;
  timestamp: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
  decisionMaker: string; // human name or AI agent identifier
}

export interface Risk {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ExternalReference {
  system: 'jira' | 'ado' | 'github' | 'slack' | 'confluence' | 'other';
  id: string;
  url?: string;
  title?: string;
  status?: string;
  lastSync?: string;
}

export interface DevlogFilter {
  filterType?: FilterType; // New filter dimension for status grouping
  status?: DevlogStatus[];
  type?: DevlogType[];
  priority?: DevlogPriority[];
  assignee?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  archived?: boolean; // Filter for archived status
  // Pagination options
  pagination?: PaginationOptions;
}

/**
 * Filter type for status-based filtering including aggregate categories
 * - Individual statuses: 'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
 * - Aggregate categories: 'total' (all), 'open' (new, in-progress, blocked, in-review, testing), 'closed' (done, cancelled)
 */
export type FilterType = DevlogStatus | 'total' | 'open' | 'closed';

export interface DevlogStats {
  totalEntries: number;
  openEntries: number;    // Open = new, in-progress, blocked, in-review, testing
  closedEntries: number;  // Closed = done, cancelled
  byStatus: Record<DevlogStatus, number>;
  byType: Record<DevlogType, number>;
  byPriority: Record<DevlogPriority, number>;
  averageCompletionTime?: number;
}

// Time series data for dashboard charts
export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  
  // Cumulative data (primary Y-axis) - shows total project progress over time
  totalCreated: number;        // Running total of all created devlogs
  totalClosed: number;         // Running total of closed devlogs (based on closedAt timestamp)
  
  // Snapshot data (secondary Y-axis) - shows workload at this point in time
  open: number;                // Entries that were open as of this date (totalCreated - totalClosed)
  
  // Daily activity (for velocity insights) - events that occurred on this specific day
  dailyCreated: number;        // Devlogs created on this specific day
  dailyClosed: number;         // Devlogs closed on this specific day (done + cancelled)
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
}

// AI Agent Context Enhancement
export interface AIContext {
  // Summary of the current understanding for AI agents
  currentSummary?: string;

  // Key insights that should be preserved across sessions
  keyInsights?: string[];

  // Current blockers or questions that need resolution
  openQuestions?: string[];

  // Related concepts or patterns from other projects
  relatedPatterns?: string[];

  // Next logical steps based on current progress
  suggestedNextSteps?: string[];

  // Context freshness indicator
  lastAIUpdate?: string;
  contextVersion?: number;
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
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
}
