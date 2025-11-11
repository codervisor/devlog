import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { agentTools } from './agent-observability/session-tools.js';
import { devlogTools, projectTools, documentTools } from './project-management/index.js';

/**
 * MCP Tools - Organized by Feature Domain
 *
 * This module provides Model Context Protocol (MCP) tools organized by the
 * platform's feature hierarchy: agent observability (primary) and project
 * management (supporting).
 *
 * **Tool Organization:**
 * - Agent Observability Tools (PRIMARY): 9 tools for monitoring AI agents
 * - Project Management Tools (SUPPORTING): 15 tools for work organization
 *
 * **Total Tools:** 24
 *
 * @module tools
 */

// ============================================================================
// AGENT OBSERVABILITY TOOLS (PRIMARY FEATURE)
// ============================================================================

/**
 * Agent Observability Tools - Primary Feature (9 tools)
 *
 * Core tools for monitoring and analyzing AI coding agent activities.
 * These tools provide the primary value proposition of the platform.
 *
 * **Session Management:**
 * - agent_start_session: Begin tracking an agent session
 * - agent_end_session: Complete a session with outcome
 * - agent_get_session: Retrieve session details
 * - agent_query_sessions: Search sessions with filters
 * - agent_get_active_sessions: List currently running sessions
 *
 * **Event Tracking:**
 * - agent_log_event: Record an agent activity event
 * - agent_query_events: Search events with filters
 *
 * **Analytics:**
 * - agent_get_event_stats: Event metrics and aggregations
 * - agent_get_session_stats: Session performance metrics
 */
export const agentObservabilityTools: Tool[] = agentTools;

// ============================================================================
// PROJECT MANAGEMENT TOOLS (SUPPORTING FEATURE)
// ============================================================================

/**
 * Project Management Tools - Supporting Feature (15 tools)
 *
 * Optional tools for organizing agent sessions by project and tracking work items.
 * These provide context and structure but are not required for agent observability.
 *
 * **Project Organization (3 tools):**
 * - list_projects: List all projects
 * - get_current_project: Get active project context
 * - switch_project: Change active project
 *
 * **Work Item Tracking (7 tools):**
 * - create_devlog: Create a work item (feature, bug, task)
 * - get_devlog: Retrieve work item details
 * - update_devlog: Update work item status/progress
 * - list_devlogs: List work items with filters
 * - add_devlog_note: Add progress note to work item
 * - complete_devlog: Mark work item as complete
 * - find_related_devlogs: Find similar work items
 *
 * **Document Management (5 tools):**
 * - upload_devlog_document: Attach file to work item
 * - list_devlog_documents: List attached documents
 * - get_devlog_document: Retrieve document details
 * - delete_devlog_document: Remove document
 * - search_devlog_documents: Search documents
 *
 * Note: "devlog" terminology is legacy. Think of these as "work items" for
 * tracking features, bugs, and tasks.
 */
export const projectManagementTools: Tool[] = [...projectTools, ...devlogTools, ...documentTools];

// ============================================================================
// LEGACY EXPORTS (backward compatibility)
// ============================================================================

/**
 * All tools combined - supports legacy imports
 * Prefer using agentObservabilityTools and projectManagementTools for clarity
 */
export const allTools: Tool[] = [...agentObservabilityTools, ...projectManagementTools];

/**
 * Legacy tool group exports - still supported
 * @deprecated Use agentObservabilityTools or projectManagementTools instead
 */
export { devlogTools, projectTools, documentTools, agentTools };

/**
 * Legacy simplified categories - still supported
 * @deprecated Use organized tool groups above for better clarity
 */
export const coreTools = devlogTools.filter((tool) =>
  ['create_devlog', 'get_devlog', 'update_devlog', 'list_devlogs'].includes(tool.name),
);

export const actionTools = devlogTools.filter((tool) =>
  ['add_devlog_note', 'complete_devlog', 'find_related_devlogs'].includes(tool.name),
);

export const contextTools = projectTools; // Project tools provide AI agent context
export const fileTools = documentTools; // Document tools for file management
