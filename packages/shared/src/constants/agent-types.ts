/**
 * Agent observability constants
 */

import type { ObservabilityAgentType, AgentEventType, SessionOutcome, EventSeverity } from '../types/agent.js';

/**
 * All supported agent types
 */
export const AGENT_TYPES: readonly ObservabilityAgentType[] = [
  'github-copilot',
  'claude-code',
  'cursor',
  'gemini-cli',
  'cline',
  'aider',
  'mcp-generic',
] as const;

/**
 * All possible agent event types
 */
export const AGENT_EVENT_TYPES: readonly AgentEventType[] = [
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
] as const;

/**
 * All possible session outcomes
 */
export const SESSION_OUTCOMES: readonly SessionOutcome[] = [
  'success',
  'partial',
  'failure',
  'abandoned',
] as const;

/**
 * All possible event severity levels
 */
export const EVENT_SEVERITIES: readonly EventSeverity[] = [
  'debug',
  'info',
  'warning',
  'error',
  'critical',
] as const;
