/**
 * Storage configuration and provider types
 */

import { DevlogEntry, DevlogFilter, DevlogId, DevlogStats, DevlogStatus, DevlogType, DevlogPriority, PaginatedResult } from './core.js';
import { 
  ChatSession, 
  ChatMessage, 
  ChatFilter, 
  ChatStats, 
  ChatSessionId, 
  ChatMessageId,
  ChatSearchResult,
  ChatDevlogLink,
  ChatWorkspace 
} from './chat.js';
import { DevlogEvent } from '../events/devlog-events.js';

// Storage Configuration Types
export type StorageType = 'json' | 'sqlite' | 'mysql' | 'postgres' | 'github';

export type ConflictResolution = 'local-wins' | 'remote-wins' | 'timestamp-wins' | 'interactive';

export interface GitCredentials {
  type: 'token' | 'ssh' | 'basic';
  token?: string; // For GitHub/GitLab PAT
  username?: string; // For basic auth
  password?: string; // For basic auth
  keyPath?: string; // For SSH key path
}

export interface GitStorageConfig {
  repository: string; // "owner/repo" or full Git URL
  branch?: string; // default: "main"
  path?: string; // default: ".devlog/"
  credentials?: GitCredentials;
  autoSync?: boolean; // default: true
  conflictResolution?: ConflictResolution;
}

export interface LocalCacheConfig {
  type: 'sqlite';
  filePath: string; // e.g., "~/.devlog/cache/project-name.db"
}

export interface JsonConfig {
  directory?: string; // default: ".devlog/"
  filePattern?: string; // default: "{id:03d}-{slug}.json"
  minPadding?: number; // default: 3 (minimum padding for IDs in filenames)
  global?: boolean; // default: true (if true, uses a global directory, i.e. "~/.devlog", otherwise uses project root)
}

export interface GitHubStorageConfig {
  owner: string;           // Repository owner (user/org)
  repo: string;            // Repository name  
  token: string;           // GitHub Personal Access Token
  apiUrl?: string;         // For GitHub Enterprise (default: api.github.com)
  branch?: string;         // For repository-specific operations
  labelsPrefix?: string;   // Prefix for devlog labels (default: 'devlog')
  
  // Strategy for mapping devlog fields to GitHub features
  mapping?: {
    useNativeType?: boolean;      // Use GitHub's native 'type' field instead of labels (default: true)
    useNativeLabels?: boolean;    // Prefer GitHub's default labels over custom prefixes (default: true)
    useStateReason?: boolean;     // Use GitHub's state_reason for nuanced status (default: true)
    projectId?: number;           // GitHub Projects v2 ID for organizing devlog entries
    projectFieldMappings?: {      // Map devlog fields to project custom fields
      priority?: string;          // Project field name for priority
      status?: string;            // Project field name for status
      type?: string;              // Project field name for type (if not using native)
    };
  };
  
  rateLimit?: {
    requestsPerHour?: number;  // Default: 5000 (GitHub's limit)
    retryDelay?: number;       // Default: 1000ms
    maxRetries?: number;       // Default: 3
  };
  cache?: {
    enabled?: boolean;       // Default: true
    ttl?: number;           // Cache TTL in ms (default: 300000 = 5min)
  };
}

export interface StorageConfig {
  type: StorageType;

  // JSON storage config
  json?: JsonConfig;

  // GitHub storage config
  github?: GitHubStorageConfig;

  // Database connection config
  connectionString?: string;
  options?: Record<string, any>;
}

export interface GitSyncStatus {
  status: 'synced' | 'ahead' | 'behind' | 'diverged' | 'error';
  localCommits?: number;
  remoteCommits?: number;
  lastSync?: string;
  error?: string;
}

// Storage Provider Interface
export interface StorageProvider {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<void>;

  /**
   * Check if an entry exists
   */
  exists(id: DevlogId): Promise<boolean>;

  /**
   * Get a single devlog entry by ID
   */
  get(id: DevlogId): Promise<DevlogEntry | null>;

  /**
   * Save or update a devlog entry
   */
  save(entry: DevlogEntry): Promise<void>;

  /**
   * Delete a devlog entry
   */
  delete(id: DevlogId): Promise<void>;

  /**
   * List all devlog entries with optional filtering
   * Returns paginated results for consistency
   */
  list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>>;

  /**
   * Search devlog entries by text query
   */
  search(query: string): Promise<PaginatedResult<DevlogEntry>>;

  /**
   * Get statistics about devlog entries
   * @param filter Optional filter to apply before calculating stats
   */
  getStats(filter?: DevlogFilter): Promise<DevlogStats>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;

  /**
   * Get the next available ID for a new entry
   */
  getNextId(): Promise<DevlogId>;

  // ===== Chat Storage Operations =====

  /**
   * Save a chat session
   */
  saveChatSession(session: ChatSession): Promise<void>;

  /**
   * Get a chat session by ID
   */
  getChatSession(id: ChatSessionId): Promise<ChatSession | null>;

  /**
   * List chat sessions with optional filtering
   */
  listChatSessions(filter?: ChatFilter, offset?: number, limit?: number): Promise<ChatSession[]>;

  /**
   * Delete a chat session
   */
  deleteChatSession(id: ChatSessionId): Promise<void>;

  /**
   * Save chat messages for a session
   */
  saveChatMessages(messages: ChatMessage[]): Promise<void>;

  /**
   * Get messages for a chat session
   */
  getChatMessages(sessionId: ChatSessionId, offset?: number, limit?: number): Promise<ChatMessage[]>;

  /**
   * Search chat content
   */
  searchChatContent(query: string, filter?: ChatFilter, limit?: number): Promise<ChatSearchResult[]>;

  /**
   * Get chat statistics
   */
  getChatStats(filter?: ChatFilter): Promise<ChatStats>;

  /**
   * Save a chat-devlog link
   */
  saveChatDevlogLink(link: ChatDevlogLink): Promise<void>;

  /**
   * Get chat-devlog links
   */
  getChatDevlogLinks(sessionId?: ChatSessionId, devlogId?: DevlogId): Promise<ChatDevlogLink[]>;

  /**
   * Remove a chat-devlog link
   */
  removeChatDevlogLink(sessionId: ChatSessionId, devlogId: DevlogId): Promise<void>;

  /**
   * Get or create chat workspaces
   */
  getChatWorkspaces(): Promise<ChatWorkspace[]>;

  /**
   * Save chat workspace information
   */
  saveChatWorkspace(workspace: ChatWorkspace): Promise<void>;

  // ===== Event Subscription Operations =====

  /**
   * Subscribe to storage change events
   * @param callback Function to call when events occur
   * @returns Promise that resolves to an unsubscribe function
   */
  subscribe?(callback: (event: DevlogEvent) => void): Promise<() => void>;

  /**
   * Start watching for changes (optional, for storage backends that need explicit watching)
   */
  startWatching?(): Promise<void>;

  /**
   * Stop watching for changes (optional, for storage backends that need explicit watching)
   */
  stopWatching?(): Promise<void>;
}

// Configuration Types
export interface DevlogConfig {
  // Traditional single workspace mode (backward compatibility)
  storage?: StorageConfig;
  
  // TODO: Uncomment when integrations are implemented
  // integrations?: EnterpriseIntegration;
  // syncStrategy?: SyncStrategy;
}

export interface DevlogManagerOptions {
  workspaceRoot?: string;
  workspace?: string; // Workspace name to use
  storage?: StorageConfig; // Direct storage config (fallback for backward compatibility)
  // integrations?: EnterpriseIntegration;
  // syncStrategy?: SyncStrategy;
}
