/**
 * Application and workspace hierarchy models for AI Chat processing
 *
 * Defines the three-level hierarchy:
 * Application (VS Code app) -> Workspace (project) -> Session (chat)
 */

export interface ApplicationMetadata {
  discovered_workspaces_count?: number;
  parsing_errors?: string[];
  total_sessions_discovered?: number;
  discovery_timestamp?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Application information (VS Code app type)
 * Top level of the hierarchy: Application -> Workspace -> Session
 */
export interface ApplicationInfo {
  /** Unique application identifier */
  id: string;
  /** Human-readable application name */
  name: string;
  /** Path to the application's data directory */
  path: string;
  /** Name of the AI agent */
  agent: string;
  /** Optional: number of workspaces in this application */
  workspaceCount?: number;
  /** Additional metadata */
  metadata?: ApplicationMetadata;
}

/**
 * Lightweight workspace information (without sessions)
 * Used for workspace discovery and listing within an application
 */
export interface WorkspaceInfo {
  /** Unique workspace identifier (within the application) */
  id: string;
  /** Human-readable workspace name */
  name: string;
  /** Path to the workspace */
  path?: string;
  /** Parent application identifier */
  applicationId: string;
  /** Optional: number of sessions in this workspace */
  sessionCount?: number;
  /** Additional metadata */
  metadata?: ApplicationMetadata;
}
