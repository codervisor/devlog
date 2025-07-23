/**
 * TypeScript interfaces for MCP tool arguments
 * This file provides proper typing for all tool arguments to eliminate 'any' types
 */

import { DevlogType, DevlogStatus, DevlogPriority, DevlogId } from '@devlog/core';

// Base interfaces for common argument patterns
export interface BaseDevlogArgs {
  id: DevlogId;
}

export interface DevlogFilterArgs {
  status?: DevlogStatus;
  type?: DevlogType;
  priority?: DevlogPriority;
  archived?: boolean; // Filter for archived status
  // Pagination support (optional)
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Core tool argument interfaces
export interface CreateDevlogArgs {
  title: string;
  type: DevlogType;
  description: string;
  priority?: DevlogPriority;
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
  initialInsights?: string[];
  relatedPatterns?: string[];
  // AI context fields (embedded from update_ai_context)
  currentSummary?: string;
  keyInsights?: string[];
  openQuestions?: string[];
  suggestedNextSteps?: string[];
}

export interface UpdateDevlogArgs extends BaseDevlogArgs {
  status?: DevlogStatus;
  blockers?: string;
  nextSteps?: string;
  files?: string[];
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
  initialInsights?: string[];
  relatedPatterns?: string[];
  // AI context fields
  currentSummary?: string;
  keyInsights?: string[];
  openQuestions?: string[];
  suggestedNextSteps?: string[];
}

export interface ListDevlogsArgs extends DevlogFilterArgs {
  // Inherits status, type, priority from DevlogFilterArgs
}

export interface SearchDevlogsArgs extends DevlogFilterArgs {
  query: string;
}

export interface AddDevlogNoteArgs extends BaseDevlogArgs {
  note: string;
  category?: 'progress' | 'issue' | 'solution' | 'idea' | 'reminder' | 'feedback';
  codeChanges?: string;
  files?: string[];
}

export interface UpdateDevlogWithNoteArgs extends BaseDevlogArgs {
  note: string;
  category?: 'progress' | 'issue' | 'solution' | 'idea' | 'reminder' | 'feedback';
  codeChanges?: string;
  files?: string[];
  status?: DevlogStatus;
  priority?: DevlogPriority;
}

export interface AddDecisionArgs extends BaseDevlogArgs {
  decision: string;
  rationale: string;
  decisionMaker: string;
  alternatives?: string[];
}

export interface CompleteDevlogArgs extends BaseDevlogArgs {
  summary?: string;
}

export interface CloseDevlogArgs extends BaseDevlogArgs {
  reason?: string;
}

export interface GetActiveContextArgs {
  limit?: number;
}

export interface GetContextForAIArgs extends BaseDevlogArgs {
  // Just the id from BaseDevlogArgs
}

export interface DiscoverRelatedDevlogsArgs {
  workDescription: string;
  workType: DevlogType;
  keywords?: string[];
  scope?: string;
}

// Legacy AI context tool (deprecated)
export interface UpdateAIContextArgs extends BaseDevlogArgs {
  summary?: string;
  insights?: string[];
  questions?: string[];
  patterns?: string[];
  nextSteps?: string[];
}
