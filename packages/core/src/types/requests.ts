/**
 * API request and response types
 */

import {
  DevlogType,
  DevlogPriority,
  DevlogId,
  DevlogStatus,
  DevlogEntry,
} from './core.js';

import {
  ChatSessionId,
  ChatMessageId,
  ChatSession,
  ChatMessage,
  ChatFilter,
  ChatStats,
  ChatSearchResult,
  ChatDevlogLink,
  ChatImportProgress,
  ChatImportConfig,
  AgentType,
  ChatStatus,
} from './chat.js';

export interface CreateDevlogRequest {
  title: string;
  type: DevlogType;
  description: string;
  priority?: DevlogPriority;
  assignee?: string;

  // Enhanced context for AI agents
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
  initialInsights?: string[];
  relatedPatterns?: string[];
}

export interface UpdateDevlogRequest {
  id: DevlogId;
  title?: string;
  description?: string;
  type?: DevlogType;
  status?: DevlogStatus;
  priority?: DevlogPriority;
  assignee?: string;
  blockers?: string;
  nextSteps?: string;
  files?: string[];

  // Enhanced context fields - matching CreateDevlogRequest
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
  initialInsights?: string[];
  relatedPatterns?: string[];

  // AI context fields - embedded from updateAIContext
  currentSummary?: string;
  keyInsights?: string[];
  openQuestions?: string[];
  suggestedNextSteps?: string[];
}

export interface DiscoverDevlogsRequest {
  workDescription: string;
  workType: DevlogType;
  keywords?: string[];
  scope?: string;
}

export interface DiscoveredDevlogEntry {
  entry: DevlogEntry;
  relevance: 'direct-text-match' | 'same-type' | 'keyword-in-notes';
  matchedTerms: string[];
}

export interface DiscoveryResult {
  relatedEntries: DiscoveredDevlogEntry[];
  activeCount: number;
  recommendation: string;
  searchParameters: DiscoverDevlogsRequest;
}

// Batch operation types
export interface BatchUpdateRequest {
  ids: DevlogId[];
  updates: Partial<Pick<UpdateDevlogRequest, 'status' | 'priority' | 'type' | 'assignee'>>;
}

export interface BatchDeleteRequest {
  ids: DevlogId[];
}

export interface BatchNoteRequest {
  ids: DevlogId[];
  content: string;
  category?: 'progress' | 'issue' | 'solution' | 'idea' | 'reminder' | 'feedback';
  files?: string[];
  codeChanges?: string;
}

export interface BatchOperationResult<T = any> {
  successful: Array<{ id: DevlogId; result: T }>;
  failed: Array<{ id: DevlogId; error: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// ===== Chat-related API Request Types =====

export interface ImportChatHistoryRequest {
  /** Import configuration */
  config: ChatImportConfig;
  
  /** Whether to run import in background */
  background?: boolean;
}

export interface ImportChatHistoryResponse {
  /** Import operation ID for tracking progress */
  importId: string;
  
  /** Initial progress state */
  progress: ChatImportProgress;
}

export interface GetChatImportProgressRequest {
  /** Import operation ID */
  importId: string;
}

export interface ListChatSessionsRequest {
  /** Filtering criteria */
  filter?: ChatFilter;
  
  /** Pagination offset */
  offset?: number;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Sort criteria */
  sort?: {
    field: 'timestamp' | 'messageCount' | 'duration' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
}

export interface GetChatSessionRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Whether to include messages */
  includeMessages?: boolean;
  
  /** Message pagination */
  messageOffset?: number;
  messageLimit?: number;
}

export interface GetChatMessagesRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Pagination offset */
  offset?: number;
  
  /** Maximum number of messages */
  limit?: number;
  
  /** Sort direction */
  sort?: 'asc' | 'desc';
}

export interface SearchChatContentRequest {
  /** Search query */
  query: string;
  
  /** Search options */
  options?: {
    /** Search type */
    type?: 'exact' | 'fuzzy' | 'semantic';
    
    /** Case sensitive search */
    caseSensitive?: boolean;
    
    /** Include archived sessions */
    includeArchived?: boolean;
    
    /** Filter criteria */
    filter?: ChatFilter;
    
    /** Maximum results */
    limit?: number;
  };
}

export interface LinkChatToDevlogRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Devlog entry ID */
  devlogId: DevlogId;
  
  /** Manual link (true) or system suggestion (false) */
  manual?: boolean;
  
  /** Additional notes about the link */
  notes?: string;
}

export interface UnlinkChatFromDevlogRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Devlog entry ID */
  devlogId: DevlogId;
}

export interface GetChatDevlogLinksRequest {
  /** Optional session ID filter */
  sessionId?: ChatSessionId;
  
  /** Optional devlog ID filter */
  devlogId?: DevlogId;
  
  /** Include unconfirmed links */
  includeUnconfirmed?: boolean;
}

export interface SuggestChatDevlogLinksRequest {
  /** Session ID to find suggestions for */
  sessionId?: ChatSessionId;
  
  /** Devlog ID to find suggestions for */
  devlogId?: DevlogId;
  
  /** Minimum confidence threshold */
  minConfidence?: number;
  
  /** Maximum number of suggestions */
  limit?: number;
}

export interface UpdateChatSessionRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Updates to apply */
  updates: {
    title?: string;
    status?: ChatStatus;
    tags?: string[];
    archived?: boolean;
    workspace?: string;
  };
}

export interface DeleteChatSessionRequest {
  /** Chat session ID */
  sessionId: ChatSessionId;
  
  /** Whether to delete associated messages */
  deleteMessages?: boolean;
}

export interface GetChatStatsRequest {
  /** Optional filter to apply to stats calculation */
  filter?: ChatFilter;
  
  /** Include detailed workspace breakdown */
  includeWorkspaceDetails?: boolean;
  
  /** Include temporal analysis */
  includeTemporalAnalysis?: boolean;
}

export interface GetChatWorkspacesRequest {
  /** Include inactive workspaces */
  includeInactive?: boolean;
  
  /** Minimum session count threshold */
  minSessions?: number;
}

export interface ArchiveChatSessionsRequest {
  /** Session IDs to archive */
  sessionIds: ChatSessionId[];
  
  /** Reason for archiving */
  reason?: string;
}

export interface BulkChatOperationResult {
  successful: Array<{ sessionId: ChatSessionId; result: any }>;
  failed: Array<{ sessionId: ChatSessionId; error: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}
