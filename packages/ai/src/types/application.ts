/**
 * Application and workspace hierarchy types for AI Chat processing
 *
 * Defines the three-level hierarchy:
 * Application (VS Code app) -> Workspace (project) -> Session (chat)
 */
import { ParserType } from './common.js';

/**
 * Application information (VS Code app type)
 * Top level of the hierarchy: Application -> Workspace -> Session
 */
export interface Application {
  /** Unique application identifier */
  id: string;
  /** Human-readable application name */
  name: string;
  /** Path to the application's data directory */
  path: string;
  /** Optional: platform type (e.g., "vscode", "cursor") */
  platform?: string;
  /** Optional: parser type used for this application */
  parser?: ParserType;
  /** Optional: number of workspaces in this application */
  workspaceCount?: number;
}
