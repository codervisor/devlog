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
