/**
 * API request and response types
 */

import type { DevlogEntry, DevlogId, DevlogPriority, DevlogStatus, DevlogType } from './core.js';
import type {
  ChatFilter,
  ChatImportConfig,
  ChatImportProgress,
  ChatSessionId,
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
  id?: DevlogId;
  title?: string;
  description?: string;
  type?: DevlogType;
  status?: DevlogStatus;
  priority?: DevlogPriority;
  // Enhanced context fields - matching CreateDevlogRequest
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
}
