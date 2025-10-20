/**
 * AI Agent Observability Type Definitions
 * 
 * Core types for tracking AI coding agent activities, sessions, and events.
 * These types align with the AI Agent Observability design document.
 */

/**
 * Supported AI coding agent types for observability
 */
export type ObservabilityAgentType =
  | 'github-copilot'
  | 'claude-code'
  | 'cursor'
  | 'gemini-cli'
  | 'cline'
  | 'aider'
  | 'mcp-generic';

/**
 * Event types captured from AI agents
 */
export type AgentEventType =
  | 'session_start'          // Agent session initiated
  | 'session_end'            // Agent session completed
  | 'file_read'              // Agent read a file
  | 'file_write'             // Agent wrote/modified a file
  | 'file_create'            // Agent created a new file
  | 'file_delete'            // Agent deleted a file
  | 'command_execute'        // Agent executed a shell command
  | 'test_run'               // Agent ran tests
  | 'build_trigger'          // Agent triggered a build
  | 'search_performed'       // Agent searched codebase
  | 'llm_request'            // Request sent to LLM
  | 'llm_response'           // Response received from LLM
  | 'error_encountered'      // Agent encountered an error
  | 'rollback_performed'     // Agent rolled back changes
  | 'commit_created'         // Agent created a commit
  | 'tool_invocation'        // Agent invoked a tool/function
  | 'user_interaction'       // User provided input/feedback
  | 'context_switch';        // Agent switched working context

/**
 * Session outcome types
 */
export type SessionOutcome = 'success' | 'partial' | 'failure' | 'abandoned';

/**
 * Event severity levels
 */
export type EventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Context information for an agent event
 */
export interface AgentEventContext {
  filePath?: string;             // File path if relevant
  workingDirectory: string;      // Current working directory
  branch?: string;               // Git branch
  commit?: string;               // Git commit SHA
  devlogId?: number;             // Associated devlog entry ID
}

/**
 * Metrics associated with an agent event
 */
export interface AgentEventMetrics {
  duration?: number;             // Event duration in ms
  tokenCount?: number;           // LLM tokens used
  fileSize?: number;             // File size in bytes
  linesChanged?: number;         // Lines added/removed
}

/**
 * Complete agent event structure
 */
export interface AgentEvent {
  id: string;                      // Unique event identifier (UUID)
  timestamp: Date;                 // Event timestamp
  type: AgentEventType;            // Event type
  agentId: ObservabilityAgentType; // Agent identifier
  agentVersion: string;            // Agent version
  sessionId: string;               // Session identifier (UUID)
  projectId: number;               // Project identifier
  
  // Context
  context: AgentEventContext;
  
  // Event-specific data (flexible JSON)
  data: Record<string, any>;
  
  // Metrics
  metrics?: AgentEventMetrics;
  
  // Relationships
  parentEventId?: string;          // Parent event for causality
  relatedEventIds?: string[];      // Related events
  
  // Metadata
  tags?: string[];                 // Searchable tags
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
  objective?: string;              // What the agent is trying to achieve
  devlogId?: number;               // Associated devlog entry
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
  id: string;                      // Unique session identifier (UUID)
  agentId: ObservabilityAgentType; // Agent identifier
  agentVersion: string;            // Agent version
  projectId: number;               // Project identifier
  startTime: Date;                 // Session start time
  endTime?: Date;                  // Session end time
  duration?: number;               // Session duration in seconds
  
  // Session context
  context: AgentSessionContext;
  
  // Session metrics
  metrics: AgentSessionMetrics;
  
  // Outcome
  outcome?: SessionOutcome;
  qualityScore?: number;           // 0-100 quality assessment
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
