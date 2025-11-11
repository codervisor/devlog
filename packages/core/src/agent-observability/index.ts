/**
 * Agent Observability Module
 * 
 * **PRIMARY FEATURE - Core agent observability functionality**
 * 
 * This module provides the core functionality for AI coding agent monitoring
 * and analytics. It is the primary value proposition of the Devlog platform.
 * 
 * **Key Components:**
 * - Event collection and storage
 * - Session management and tracking
 * - Performance metrics and analytics
 * - Quality assessment and scoring
 * 
 * **Usage:**
 * Import services, types, and utilities from this module to build agent
 * observability features. These are re-exported from their current locations
 * until the full reorganization is complete.
 * 
 * @module agent-observability
 * @category Agent Observability
 * 
 * @example
 * ```typescript
 * import { 
 *   AgentEventService, 
 *   AgentSessionService,
 *   AgentEvent,
 *   AgentSession
 * } from '@codervisor/devlog-core/agent-observability';
 * 
 * // Start tracking an agent session
 * const sessionService = AgentSessionService.getInstance(projectId);
 * await sessionService.initialize();
 * const session = await sessionService.create({
 *   agentId: 'github-copilot',
 *   projectId: 1,
 *   objective: 'Implement authentication'
 * });
 * ```
 */

// ============================================================================
// Services - Event and Session Management
// ============================================================================

/**
 * Re-export agent services from their organized locations
 */
export { AgentEventService } from './events/index.js';
export { AgentSessionService } from './sessions/index.js';

// ============================================================================
// Types - Agent Observability Data Structures
// ============================================================================

/**
 * Re-export agent observability types
 */
export type {
  // Agent types
  ObservabilityAgentType,
  
  // Event types and interfaces
  AgentEvent,
  AgentEventType,
  AgentEventContext,
  AgentEventMetrics,
  CreateAgentEventInput,
  EventFilter,
  EventStats,
  EventSeverity,
  TimelineEvent,
  
  // Session types and interfaces
  AgentSession,
  AgentSessionContext,
  CreateAgentSessionInput,
  UpdateAgentSessionInput,
  SessionFilter,
  SessionStats,
  SessionOutcome,
} from '../types/index.js';
