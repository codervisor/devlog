/**
 * Workspace types and interfaces for devlog application
 * 
 * Workspaces provide isolation and grouping of devlog entries
 * separate from the underlying storage mechanism.
 */

import { StorageConfig } from './storage.js';

/**
 * Workspace metadata and settings
 */
export interface WorkspaceMetadata {
  /** Unique workspace identifier */
  id: string;
  
  /** Human-readable workspace name */
  name: string;
  
  /** Optional workspace description */
  description?: string;
  
  /** Workspace creation timestamp */
  createdAt: Date;
  
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  
  /** Workspace settings and preferences */
  settings?: WorkspaceSettings;
}

/**
 * Workspace-specific settings and preferences
 */
export interface WorkspaceSettings {
  /** Default priority for new devlog entries */
  defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
  
  /** Workspace color/theme identifier */
  theme?: string;
  
  /** Auto-archive completed entries after N days */
  autoArchiveDays?: number;
  
  /** Custom tags available in this workspace */
  availableTags?: string[];
  
  /** Workspace-specific configuration */
  customSettings?: Record<string, any>;
}

/**
 * Complete workspace configuration that links workspace to storage
 */
export interface WorkspaceConfiguration {
  /** Workspace metadata and settings */
  workspace: WorkspaceMetadata;
  
  /** Storage configuration for this workspace */
  storage: StorageConfig;
}

/**
 * Multi-workspace configuration
 */
export interface WorkspacesConfig {
  /** Default workspace ID to use when none specified */
  defaultWorkspace: string;
  
  /** Map of workspace ID to workspace configuration */
  workspaces: Record<string, WorkspaceConfiguration>;
  
  /** Global settings that apply to all workspaces */
  globalSettings?: {
    /** Allow workspace creation via API */
    allowDynamicWorkspaces?: boolean;
    
    /** Maximum number of workspaces */
    maxWorkspaces?: number;
    
    /** Workspace naming pattern validation */
    namingPattern?: string;
  };
}

/**
 * Workspace context for operations
 */
export interface WorkspaceContext {
  /** Current workspace ID */
  workspaceId: string;
  
  /** Current workspace metadata */
  workspace: WorkspaceMetadata;
  
  /** Whether this is the default workspace */
  isDefault: boolean;
}

/**
 * Workspace manager interface for managing multiple workspaces
 */
export interface WorkspaceManager {
  /**
   * List all available workspaces
   */
  listWorkspaces(): Promise<WorkspaceMetadata[]>;
  
  /**
   * Get workspace by ID
   */
  getWorkspace(id: string): Promise<WorkspaceMetadata | null>;
  
  /**
   * Create a new workspace
   */
  createWorkspace(workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>, storage: StorageConfig): Promise<WorkspaceMetadata>;
  
  /**
   * Update workspace metadata
   */
  updateWorkspace(id: string, updates: Partial<WorkspaceMetadata>): Promise<WorkspaceMetadata>;
  
  /**
   * Delete a workspace and all its data
   */
  deleteWorkspace(id: string): Promise<void>;
  
  /**
   * Get the default workspace ID
   */
  getDefaultWorkspace(): Promise<string>;
  
  /**
   * Set the default workspace
   */
  setDefaultWorkspace(id: string): Promise<void>;
  
  /**
   * Switch to a workspace and return context
   */
  switchToWorkspace(id: string): Promise<WorkspaceContext>;
  
  /**
   * Get current workspace context
   */
  getCurrentWorkspace(): Promise<WorkspaceContext | null>;
  
  /**
   * Get workspace configuration (including storage config)
   */
  getWorkspaceConfig(id: string): Promise<WorkspaceConfiguration | null>;
  
  /**
   * Get storage configuration for a workspace
   */
  getWorkspaceStorage(id: string): Promise<StorageConfig | null>;
}

/**
 * Workspace-aware devlog operation context
 */
export interface DevlogOperationContext {
  /** Workspace context for the operation */
  workspace: WorkspaceContext;
  
  /** Additional operation metadata */
  metadata?: Record<string, any>;
}
