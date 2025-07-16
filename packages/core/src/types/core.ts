/**
 * Core devlog types and interfaces
 */

export type DevlogType = 'feature' | 'bugfix' | 'task' | 'refactor' | 'docs';

export type DevlogStatus =
  | 'new'
  | 'in-progress'
  | 'blocked'
  | 'in-review'
  | 'testing'
  | 'done'
  | 'closed';

export type DevlogPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Categories for devlog notes - used to classify and organize different types of information
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
  /** Work progress updates, milestones, and status changes */
  | 'progress'
  /** Problems encountered, bugs found, or obstacles discovered */
  | 'issue'
  /** Solutions implemented, fixes applied, or workarounds found */
  | 'solution'
  /** New ideas, suggestions, or potential improvements */
  | 'idea'
  /** Important reminders, action items, or follow-up tasks */
  | 'reminder'
  /** External feedback from users, customers, stakeholders, or usability testing */
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
  assignee?: string;
  notes: DevlogNote[];
  files?: string[];
  relatedDevlogs?: string[];

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
  status?: DevlogStatus[];
  type?: DevlogType[];
  priority?: DevlogPriority[];
  assignee?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface DevlogStats {
  totalEntries: number;
  byStatus: Record<DevlogStatus, number>;
  byType: Record<DevlogType, number>;
  byPriority: Record<DevlogPriority, number>;
  averageCompletionTime?: number;
}

// Time series data for dashboard charts
export interface TimeSeriesDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  created: number;
  completed: number;
  inProgress: number;
  inReview: number;
  testing: number;
  new: number;
  blocked: number;
  done: number;
  closed: number;
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
