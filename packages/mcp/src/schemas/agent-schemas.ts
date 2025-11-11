/**
 * Agent observability operation schemas
 *
 * Schemas for AI agent event collection and session management
 */

import { z } from 'zod';

// === BASE SCHEMAS ===

export const ObservabilityAgentTypeSchema = z
  .enum(['github-copilot', 'claude-code', 'cursor', 'gemini-cli', 'cline', 'aider', 'mcp-generic'])
  .describe('Type of AI coding agent');

export const AgentEventTypeSchema = z
  .enum([
    'session_start',
    'session_end',
    'file_read',
    'file_write',
    'file_create',
    'file_delete',
    'command_execute',
    'test_run',
    'build_trigger',
    'search_performed',
    'llm_request',
    'llm_response',
    'error_encountered',
    'rollback_performed',
    'commit_created',
    'tool_invocation',
    'user_interaction',
    'context_switch',
  ])
  .describe('Type of agent event');

export const EventSeveritySchema = z
  .enum(['debug', 'info', 'warning', 'error', 'critical'])
  .describe('Severity level of the event');

export const SessionOutcomeSchema = z
  .enum(['success', 'partial', 'failure', 'abandoned'])
  .describe('Outcome of the agent session');

export const SessionIdSchema = z.string().uuid().describe('Session identifier (UUID)');

export const AgentVersionSchema = z.string().describe('Version of the agent');

// Use numeric project ID for agent observability (database integer)
export const AgentProjectIdSchema = z.number().int().positive().describe('Project identifier');

// === START SESSION ===

export const StartAgentSessionSchema = z.object({
  agentId: ObservabilityAgentTypeSchema,
  agentVersion: AgentVersionSchema,
  projectId: AgentProjectIdSchema,
  objective: z.string().optional().describe('What the agent is trying to achieve'),
  devlogId: z.number().int().positive().optional().describe('Associated devlog entry ID'),
  branch: z.string().describe('Git branch name'),
  initialCommit: z.string().describe('Git commit SHA at session start'),
  triggeredBy: z
    .enum(['user', 'automation', 'schedule'])
    .default('user')
    .describe('How the session was triggered'),
});

// === END SESSION ===

export const EndAgentSessionSchema = z.object({
  sessionId: SessionIdSchema,
  outcome: SessionOutcomeSchema,
  qualityScore: z.number().min(0).max(100).optional().describe('Quality score (0-100)'),
  finalCommit: z.string().optional().describe('Git commit SHA at session end'),
});

// === LOG EVENT ===

export const LogAgentEventSchema = z.object({
  sessionId: SessionIdSchema,
  type: AgentEventTypeSchema,
  agentId: ObservabilityAgentTypeSchema,
  agentVersion: AgentVersionSchema,
  projectId: AgentProjectIdSchema,
  filePath: z.string().optional().describe('File path if relevant to the event'),
  workingDirectory: z.string().describe('Current working directory'),
  branch: z.string().optional().describe('Git branch'),
  commit: z.string().optional().describe('Git commit SHA'),
  devlogId: z.number().int().positive().optional().describe('Associated devlog entry ID'),
  data: z.record(z.any()).default({}).describe('Event-specific data (flexible JSON)'),
  metrics: z
    .object({
      duration: z.number().optional().describe('Event duration in milliseconds'),
      tokenCount: z.number().optional().describe('LLM tokens used'),
      fileSize: z.number().optional().describe('File size in bytes'),
      linesChanged: z.number().optional().describe('Lines added or removed'),
    })
    .optional()
    .describe('Event metrics'),
  parentEventId: z.string().uuid().optional().describe('Parent event ID for causality'),
  relatedEventIds: z.array(z.string().uuid()).optional().describe('Related event IDs'),
  tags: z.array(z.string()).optional().describe('Searchable tags'),
  severity: EventSeveritySchema.optional(),
});

// === QUERY EVENTS ===

export const QueryAgentEventsSchema = z.object({
  sessionId: SessionIdSchema.optional(),
  projectId: AgentProjectIdSchema.optional(),
  agentId: ObservabilityAgentTypeSchema.optional(),
  eventType: AgentEventTypeSchema.optional(),
  severity: EventSeveritySchema.optional(),
  startTime: z.string().datetime().optional().describe('Filter events after this time (ISO 8601)'),
  endTime: z.string().datetime().optional().describe('Filter events before this time (ISO 8601)'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .default(100)
    .describe('Maximum number of events to return'),
  offset: z.number().int().nonnegative().default(0).describe('Number of events to skip'),
});

// === QUERY SESSIONS ===

export const QueryAgentSessionsSchema = z.object({
  projectId: AgentProjectIdSchema.optional(),
  agentId: ObservabilityAgentTypeSchema.optional(),
  outcome: SessionOutcomeSchema.optional(),
  startTimeFrom: z
    .string()
    .datetime()
    .optional()
    .describe('Filter sessions starting after this time (ISO 8601)'),
  startTimeTo: z
    .string()
    .datetime()
    .optional()
    .describe('Filter sessions starting before this time (ISO 8601)'),
  minQualityScore: z.number().min(0).max(100).optional().describe('Minimum quality score'),
  maxQualityScore: z.number().min(0).max(100).optional().describe('Maximum quality score'),
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .default(100)
    .describe('Maximum number of sessions to return'),
  offset: z.number().int().nonnegative().default(0).describe('Number of sessions to skip'),
});

// === GET SESSION ===

export const GetAgentSessionSchema = z.object({
  sessionId: SessionIdSchema,
});

// === GET EVENT STATS ===

export const GetEventStatsSchema = z.object({
  sessionId: SessionIdSchema.optional(),
  projectId: AgentProjectIdSchema.optional(),
  startTime: z.string().datetime().optional().describe('Start of time range (ISO 8601)'),
  endTime: z.string().datetime().optional().describe('End of time range (ISO 8601)'),
});

// === GET SESSION STATS ===

export const GetSessionStatsSchema = z.object({
  projectId: AgentProjectIdSchema.optional(),
  startTimeFrom: z.string().datetime().optional().describe('Start of time range (ISO 8601)'),
  startTimeTo: z.string().datetime().optional().describe('End of time range (ISO 8601)'),
});

// === GET ACTIVE SESSIONS ===

export const GetActiveSessionsSchema = z.object({
  projectId: AgentProjectIdSchema.optional(),
});
