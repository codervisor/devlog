/**
 * Hierarchy types for the web application
 * 
 * These types mirror the backend types but are specifically
 * for use in the frontend components.
 */

import type { Project, Machine, Workspace, ChatSession } from '@prisma/client';

/**
 * Workspace with sessions and event count
 */
export interface WorkspaceWithSessions {
  workspace: Workspace;
  sessions: ChatSession[];
  eventCount: number;
}

/**
 * Machine with its workspaces
 */
export interface MachineWithWorkspaces {
  machine: Machine;
  workspaces: WorkspaceWithSessions[];
}

/**
 * Complete project hierarchy
 */
export interface ProjectHierarchy {
  project: Project;
  machines: MachineWithWorkspaces[];
}

/**
 * Hierarchy filter state
 */
export interface HierarchyFilter {
  projectId?: number;
  machineId?: number;
  workspaceId?: number;
}
