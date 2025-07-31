/**
 * TypeScript interfaces for MCP tool arguments
 *
 * These types are derived from the Zod schemas but with proper defaults applied.
 */

import { DevlogType, DevlogStatus, DevlogPriority, DevlogId } from '@codervisor/devlog-core';

// Core tool argument interfaces with proper defaults
export interface CreateDevlogArgs {
  title: string;
  type: DevlogType;
  description: string;
  priority: DevlogPriority; // Required with default 'medium' applied by schema
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
}

export interface UpdateDevlogArgs {
  id: DevlogId;
  status?: DevlogStatus;
  priority?: DevlogPriority;
  businessContext?: string;
  technicalContext?: string;
  acceptanceCriteria?: string[];
}

export interface GetDevlogArgs {
  id: DevlogId;
}

export interface ListDevlogsArgs {
  status?: DevlogStatus;
  type?: DevlogType;
  priority?: DevlogPriority;
  archived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchDevlogsArgs {
  query: string;
  status?: DevlogStatus;
  type?: DevlogType;
  priority?: DevlogPriority;
  archived?: boolean;
}

export interface AddDevlogNoteArgs {
  id: DevlogId;
  note: string;
  category: 'progress' | 'issue' | 'solution' | 'idea' | 'reminder' | 'feedback'; // Required with default 'progress' applied by schema
}

export interface UpdateDevlogWithNoteArgs {
  id: DevlogId;
  status?: DevlogStatus;
  priority?: DevlogPriority;
  note: string;
  category: 'progress' | 'issue' | 'solution' | 'idea' | 'reminder' | 'feedback'; // Required with default 'progress' applied by schema
}

export interface CompleteDevlogArgs {
  id: DevlogId;
  summary?: string;
}

export interface CloseDevlogArgs {
  id: DevlogId;
  reason?: string;
}

export interface ArchiveDevlogArgs {
  id: DevlogId;
}

export interface DiscoverRelatedDevlogsArgs {
  workDescription: string;
  workType: DevlogType;
  keywords?: string[];
  scope?: string;
}

export interface ListProjectsArgs {
  // No arguments
}

export interface GetCurrentProjectArgs {
  // No arguments
}

export interface SwitchProjectArgs {
  projectId: string;
}

// Legacy interfaces for backward compatibility
export interface BaseDevlogArgs {
  id: DevlogId;
}

export interface DevlogFilterArgs {
  status?: DevlogStatus;
  type?: DevlogType;
  priority?: DevlogPriority;
  archived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface GetActiveContextArgs {
  limit?: number;
}
