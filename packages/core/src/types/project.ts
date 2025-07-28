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
export interface ProjectMetadata {
  /** Unique project identifier */
  id: number;

  /** Human-readable project name */
  name: string;

  /** Optional project description */
  description?: string;

  /** Project creation timestamp */
  createdAt: Date;

  /** Last accessed timestamp */
  lastAccessedAt: Date;

  /** Project settings and preferences */
  settings?: ProjectSettings;

  /** Repository/codebase URL (optional) */
  repositoryUrl?: string;
}

/**
 * Project-specific settings and preferences
 */
export interface ProjectSettings {
  /** Default priority for new devlog entries */
  defaultPriority?: 'low' | 'medium' | 'high' | 'critical';

  /** Project color/theme identifier */
  theme?: string;

  /** Auto-archive completed entries after N days */
  autoArchiveDays?: number;

  /** Custom tags available in this project */
  availableTags?: string[];

  /** Project-specific configuration */
  customSettings?: Record<string, any>;
}

/**
 * Project context for operations
 */
export interface ProjectContext {
  /** Current project ID */
  projectId: number;

  /** Current project metadata */
  project: ProjectMetadata;
}

/**
 * Project manager interface for managing multiple projects
 */
export interface ProjectManager {
  /**
   * List all available projects
   */
  listProjects(): Promise<ProjectMetadata[]>;

  /**
   * Get project by ID
   */
  getProject(id: number): Promise<ProjectMetadata | null>;

  /**
   * Create a new project
   */
  createProject(
    project: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata>;

  /**
   * Update project metadata
   */
  updateProject(id: number, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata>;

  /**
   * Delete a project and all its data
   */
  deleteProject(id: number): Promise<void>;

  /**
   * Get the default project ID
   */
  getDefaultProject(): Promise<number>;

  /**
   * Set the default project
   */
  setDefaultProject(id: number): Promise<void>;

  /**
   * Switch to a project and return context
   */
  switchToProject(id: number): Promise<ProjectContext>;

  /**
   * Get current project context
   */
  getCurrentProject(): Promise<ProjectContext | null>;
}

/**
 * Project-aware devlog operation context
 */
export interface DevlogOperationContext {
  /** Project context for the operation */
  project: ProjectContext;

  /** Additional operation metadata */
  metadata?: Record<string, any>;
}

/**
 * Multi-project configuration (simplified - no per-project storage)
 */
export interface ProjectsConfig {
  /** Default project ID to use when none specified */
  defaultProject: number;

  /** Map of project ID to project metadata */
  projects: Record<number, ProjectMetadata>;

  /** Global settings that apply to all projects */
  globalSettings?: {
    /** Allow project creation via API */
    allowDynamicProjects?: boolean;

    /** Maximum number of projects */
    maxProjects?: number;

    /** Project naming pattern validation */
    namingPattern?: string;
  };
}

/**
 * Application-level storage configuration (centralized)
 */
export interface AppStorageConfig {
  /** Storage configuration for the entire application */
  storage: StorageConfig;

  /** Optional cache configuration */
  cache?: {
    enabled: boolean;
    type: 'memory' | 'redis';
    ttl?: number;
  };
}

// Re-export core storage types for backward compatibility
import type { StorageConfig } from './storage.js';
export type { StorageConfig };
