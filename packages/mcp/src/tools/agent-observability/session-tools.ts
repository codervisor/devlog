/**
 * Agent observability tools
 *
 * Tools for AI agent event collection, session management, and analytics
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from '../../utils/schema-converter.js';
import {
  StartAgentSessionSchema,
  EndAgentSessionSchema,
  LogAgentEventSchema,
  QueryAgentEventsSchema,
  QueryAgentSessionsSchema,
  GetAgentSessionSchema,
  GetEventStatsSchema,
  GetSessionStatsSchema,
  GetActiveSessionsSchema,
} from '../../schemas/index.js';

/**
 * Agent observability tools for tracking AI coding agent activities
 *
 * These tools enable comprehensive monitoring of AI agent behavior including:
 * - Session lifecycle tracking (start, end, update)
 * - Event collection (file operations, LLM calls, commands, errors)
 * - Analytics and statistics
 * - Real-time monitoring of active sessions
 */
export const agentTools: Tool[] = [
  {
    name: 'agent_start_session',
    description:
      'Start tracking a new AI agent working session. Call this at the beginning of a new task or feature implementation to track all agent activities.',
    inputSchema: zodToJsonSchema(StartAgentSessionSchema),
  },

  {
    name: 'agent_end_session',
    description:
      'End an AI agent session and record the outcome. Call this when completing or abandoning a task.',
    inputSchema: zodToJsonSchema(EndAgentSessionSchema),
  },

  {
    name: 'agent_log_event',
    description:
      'Log a specific AI agent event (file operation, LLM call, command execution, error, etc.). Use this to record individual actions during a session.',
    inputSchema: zodToJsonSchema(LogAgentEventSchema),
  },

  {
    name: 'agent_query_events',
    description:
      'Query and filter agent events with various criteria. Use this to analyze agent behavior, debug issues, or generate reports.',
    inputSchema: zodToJsonSchema(QueryAgentEventsSchema),
  },

  {
    name: 'agent_query_sessions',
    description:
      'Query and filter agent sessions with various criteria. Use this to review past work, compare outcomes, or analyze patterns.',
    inputSchema: zodToJsonSchema(QueryAgentSessionsSchema),
  },

  {
    name: 'agent_get_session',
    description:
      'Get detailed information about a specific agent session including all metrics and context.',
    inputSchema: zodToJsonSchema(GetAgentSessionSchema),
  },

  {
    name: 'agent_get_event_stats',
    description:
      'Get aggregated statistics about agent events (counts by type, severity, token usage, etc.). Useful for performance analysis.',
    inputSchema: zodToJsonSchema(GetEventStatsSchema),
  },

  {
    name: 'agent_get_session_stats',
    description:
      'Get aggregated statistics about agent sessions (success rates, quality scores, duration, etc.). Useful for productivity analysis.',
    inputSchema: zodToJsonSchema(GetSessionStatsSchema),
  },

  {
    name: 'agent_get_active_sessions',
    description:
      'Get all currently active (ongoing) agent sessions. Use this for real-time monitoring.',
    inputSchema: zodToJsonSchema(GetActiveSessionsSchema),
  },
];
