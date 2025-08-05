/**
 * Workspace model for AI Chat processing
 */

import { ChatSession } from './chat-session.js';

export interface WorkspaceMetadata {
  discovered_files_count?: number;
  parsing_errors?: string[];
  total_sessions_discovered?: number;
  discovery_timestamp?: string;
  vscode_installations?: string[];
  [key: string]: unknown; // Allow additional properties
}

// TypeScript interface
export interface Workspace {
  /** Name of the AI agent */
  agent: string;
  /** Version of the agent or data format */
  version?: string;
  /** Path to the workspace */
  workspace_path?: string;
  /** List of chat sessions */
  chat_sessions: ChatSession[];
  /** Additional metadata */
  metadata: WorkspaceMetadata;
}

// Utility class for data manipulation
export class WorkspaceDataContainer implements Workspace {
  agent: string;
  version?: string;
  workspace_path?: string;
  chat_sessions: ChatSession[];
  metadata: WorkspaceMetadata;

  constructor(data: Partial<Workspace> & Pick<Workspace, 'agent'>) {
    this.agent = data.agent;
    this.version = data.version;
    this.workspace_path = data.workspace_path;
    this.chat_sessions = data.chat_sessions || [];
    this.metadata = data.metadata || {};
  }
}
