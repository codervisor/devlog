/**
 * Workspace model for AI Chat processing
 */

/**
 * Lightweight workspace information (without sessions)
 * Used for workspace discovery and listing within an application
 */
export interface Workspace {
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
}
