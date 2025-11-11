/**
 * AI Agent Observability Type Definitions
 *
 * **PRIMARY FEATURE - Core agent observability functionality**
 *
 * This module defines the core data structures for tracking AI coding agent
 * activities, sessions, and metrics. These types form the foundation of the
 * AI agent observability platform, enabling teams to:
 * - Monitor AI agent activities in real-time
 * - Analyze performance and quality metrics
 * - Understand patterns and optimize workflows
 * - Ensure compliance and auditability
 *
 * These types align with the AI Agent Observability design document.
 *
 * @module types/agent
 * @category Agent Observability
 * @see {@link docs/design/ai-agent-observability-design.md} for full system design
 */

/**
 * Supported AI coding agent types for observability
 *
 * Represents the major AI coding assistants that can be monitored by the platform.
 * Each agent type may have different data collection methods and capabilities.
 *
 * @example
 * ```typescript
 * const agentType: ObservabilityAgentType = 'github-copilot';
 * ```
 */
export type ObservabilityAgentType =
  | 'github-copilot' // GitHub Copilot and GitHub Coding Agent
  | 'claude-code' // Anthropic's Claude Code assistant
  | 'cursor' // Cursor AI editor
  | 'gemini-cli' // Google Gemini CLI tool
  | 'cline' // Cline (formerly Claude Dev)
  | 'aider' // Aider AI pair programming
  | 'mcp-generic'; // Generic MCP-compatible agent

/**
 * Event types captured from AI agents
 *
 * Represents all possible actions that an AI agent can perform during a coding session.
 * Events are immutable, timestamped records that form a complete audit trail.
 *
 * @example
 * ```typescript
 * const event: AgentEventType = 'file_write';
 * ```
 */
export type AgentEventType =
  | 'session_start' // Agent session initiated - marks beginning of work
  | 'session_end' // Agent session completed - marks end of work
  | 'file_read' // Agent read a file (context gathering)
  | 'file_write' // Agent wrote/modified a file (code generation)
  | 'file_create' // Agent created a new file
  | 'file_delete' // Agent deleted a file
  | 'command_execute' // Agent executed a shell command (build, test, etc.)
  | 'test_run' // Agent ran tests (validation)
  | 'build_trigger' // Agent triggered a build
  | 'search_performed' // Agent searched codebase (information retrieval)
  | 'llm_request' // Request sent to LLM (token usage tracking)
  | 'llm_response' // Response received from LLM (quality analysis)
  | 'error_encountered' // Agent encountered an error (debugging)
  | 'rollback_performed' // Agent rolled back changes (error recovery)
  | 'commit_created' // Agent created a commit (version control)
  | 'tool_invocation' // Agent invoked a tool/function (extensibility)
  | 'user_interaction' // User provided input/feedback (collaboration)
  | 'context_switch'; // Agent switched working context (multi-tasking)

/**
 * Session outcome types
 *
 * Represents the final result of an agent session for analytics and pattern detection.
 *
 * @example
 * ```typescript
 * const outcome: SessionOutcome = 'success'; // All goals achieved
 * ```
 */
export type SessionOutcome =
  | 'success' // All objectives completed successfully
  | 'partial' // Some objectives completed, others not
  | 'failure' // Objectives not met, errors encountered
  | 'abandoned'; // Session stopped before completion

/**
 * Event severity levels
 *
 * Categorizes events by importance for filtering and alerting.
 *
 * @example
 * ```typescript
 * const severity: EventSeverity = 'error'; // Requires attention
 * ```
 */
export type EventSeverity =
  | 'debug' // Detailed debugging information
  | 'info' // Normal informational events
  | 'warning' // Potential issues or concerns
  | 'error' // Errors that need attention
  | 'critical'; // Critical failures requiring immediate action

/**
 * Context information for an agent event
 *
 * Provides environmental and location context for each event to enable
 * detailed analysis and debugging. This information helps correlate events
 * with code structure, version control state, and optional work tracking.
 *
 * @example
 * ```typescript
 * const context: AgentEventContext = {
 *   workingDirectory: '/home/user/project',
 *   filePath: 'src/auth/login.ts',
 *   branch: 'feature/auth',
 *   commit: 'abc123',
 *   devlogId: 42  // Optional: link to work item
 * };
 * ```
 */
export interface AgentEventContext {
  /** File path relative to working directory (if event is file-specific) */
  filePath?: string;
  /** Current working directory at time of event */
  workingDirectory: string;
  /** Git branch name (if in a git repository) */
  branch?: string;
  /** Git commit SHA (if in a git repository) */
  commit?: string;
  /** Associated work item ID (optional - for work tracking integration) */
  devlogId?: number;
}

/**
 * Metrics associated with an agent event
 *
 * Quantitative data for performance analysis and cost tracking.
 * Different event types may populate different metrics fields.
 *
 * @example
 * ```typescript
 * const metrics: AgentEventMetrics = {
 *   duration: 1500,       // 1.5 seconds
 *   tokenCount: 1200,     // LLM tokens for this event
 *   linesChanged: 45      // Code impact
 * };
 * ```
 */
export interface AgentEventMetrics {
  /** Event duration in milliseconds (for performance analysis) */
  duration?: number;
  /** LLM tokens used (for cost tracking and efficiency) */
  tokenCount?: number;
  /** File size in bytes (for file operations) */
  fileSize?: number;
  /** Lines added/removed (for code generation metrics) */
  linesChanged?: number;
}

/**
 * Complete agent event structure
 *
 * Represents a single immutable event captured from an AI coding agent.
 * Events form the foundation of the observability platform, providing
 * a complete, timestamped audit trail of all agent activities.
 *
 * **Key Characteristics:**
 * - Immutable: Events never change after creation
 * - Timestamped: Precise ordering for timeline reconstruction
 * - Contextualized: Full environmental context captured
 * - Relational: Can reference parent and related events
 *
 * @example
 * ```typescript
 * const event: AgentEvent = {
 *   id: 'evt_123abc',
 *   timestamp: new Date(),
 *   type: 'file_write',
 *   agentId: 'github-copilot',
 *   agentVersion: '1.0.0',
 *   sessionId: 'session_xyz',
 *   projectId: 1,
 *   context: { workingDirectory: '/app', filePath: 'src/main.ts' },
 *   data: { content: 'function main() {...}' },
 *   metrics: { duration: 1500, tokenCount: 1200 }
 * };
 * ```
 */
export interface AgentEvent {
  /** Unique event identifier (UUID) - immutable and globally unique */
  id: string;
  /** Event timestamp (ISO 8601) - precise to millisecond */
  timestamp: Date;
  /** Event type - categorizes the action performed */
  type: AgentEventType;
  /** Agent identifier - which AI assistant performed this action */
  agentId: ObservabilityAgentType;
  /** Agent version - for tracking behavior across versions */
  agentVersion: string;
  /** Session identifier (UUID) - groups events into complete workflows */
  sessionId: string;
  /** Project identifier - for multi-project isolation */
  projectId: number;

  /** Context - environmental information at time of event */
  context: AgentEventContext;

  /** Event-specific data (flexible JSON) - varies by event type */
  data: Record<string, any>;

  /** Metrics - quantitative measurements for analysis */
  metrics?: AgentEventMetrics;

  /** Parent event ID - for causal relationships and event chains */
  parentEventId?: string;
  /** Related event IDs - for cross-referencing related activities */
  relatedEventIds?: string[];

  /** Tags - searchable labels for categorization */
  tags?: string[];
  /** Severity - importance level for filtering and alerting */
  severity?: EventSeverity;
}

/**
 * Input for creating a new agent event
 */
export interface CreateAgentEventInput {
  type: AgentEventType;
  agentId: ObservabilityAgentType;
  agentVersion: string;
  sessionId: string;
  projectId: number;
  context: AgentEventContext;
  data: Record<string, any>;
  metrics?: AgentEventMetrics;
  parentEventId?: string;
  relatedEventIds?: string[];
  tags?: string[];
  severity?: EventSeverity;
}

/**
 * Filter criteria for querying agent events
 */
export interface EventFilter {
  sessionId?: string;
  projectId?: number;
  agentId?: ObservabilityAgentType;
  eventType?: AgentEventType;
  severity?: EventSeverity;
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Event statistics result
 */
export interface EventStats {
  totalEvents: number;
  eventsByType: Record<AgentEventType, number>;
  eventsBySeverity: Record<EventSeverity, number>;
  totalTokens: number;
  averageDuration: number;
}

/**
 * Context information for an agent session
 */
export interface AgentSessionContext {
  objective?: string; // What the agent is trying to achieve
  devlogId?: number; // Associated devlog entry
  branch: string;
  initialCommit: string;
  finalCommit?: string;
  triggeredBy: 'user' | 'automation' | 'schedule';
}

/**
 * Metrics for an agent session
 */
export interface AgentSessionMetrics {
  eventsCount: number;
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
  tokensUsed: number;
  commandsExecuted: number;
  errorsEncountered: number;
  testsRun: number;
  testsPassed: number;
  buildAttempts: number;
  buildSuccesses: number;
}

/**
 * Complete agent session structure
 */
export interface AgentSession {
  id: string; // Unique session identifier (UUID)
  agentId: ObservabilityAgentType; // Agent identifier
  agentVersion: string; // Agent version
  projectId: number; // Project identifier
  startTime: Date; // Session start time
  endTime?: Date; // Session end time
  duration?: number; // Session duration in seconds

  // Session context
  context: AgentSessionContext;

  // Session metrics
  metrics: AgentSessionMetrics;

  // Outcome
  outcome?: SessionOutcome;
  qualityScore?: number; // 0-100 quality assessment
}

/**
 * Input for creating a new agent session
 */
export interface CreateAgentSessionInput {
  agentId: ObservabilityAgentType;
  agentVersion: string;
  projectId: number;
  context: AgentSessionContext;
}

/**
 * Input for updating an existing agent session
 */
export interface UpdateAgentSessionInput {
  endTime?: Date;
  duration?: number;
  context?: Partial<AgentSessionContext>;
  metrics?: Partial<AgentSessionMetrics>;
  outcome?: SessionOutcome;
  qualityScore?: number;
}

/**
 * Filter criteria for querying agent sessions
 */
export interface SessionFilter {
  projectId?: number;
  agentId?: ObservabilityAgentType;
  outcome?: SessionOutcome;
  startTimeFrom?: Date;
  startTimeTo?: Date;
  minQualityScore?: number;
  maxQualityScore?: number;
  limit?: number;
  offset?: number;
}

/**
 * Session statistics result
 */
export interface SessionStats {
  totalSessions: number;
  sessionsByAgent: Record<ObservabilityAgentType, number>;
  sessionsByOutcome: Record<SessionOutcome, number>;
  averageQualityScore: number;
  averageDuration: number;
  totalTokensUsed: number;
}

/**
 * Timeline event for visualization
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: AgentEventType;
  description: string;
  severity?: EventSeverity;
  data?: Record<string, any>;
}
