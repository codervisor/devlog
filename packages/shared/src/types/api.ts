/**
 * API request and response types
 */

import type {
  DevlogId,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
} from './devlog.js';

export interface CreateDevlogRequest {
  title: string;
  type: DevlogType;
  description: string;
  priority?: DevlogPriority;
  assignee?: string;
  projectId: number;

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
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}
