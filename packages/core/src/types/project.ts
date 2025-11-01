/**
 * Project types and interfaces for devlog application
 *
 * Projects provide isolation and grouping of devlog entries for different
 * repositories, codebases, or logical project boundaries. Unlike the previous
 * workspace system, projects share a centralized database configuration.
 */

/**
 * Project metadata and settings
 */
export interface Project {
  /** Unique project identifier */
  id: number;

  /** Human-readable project name (also used as URL slug) */
  name: string;

  /** Optional project description */
  description?: string;

  /** Project creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}
