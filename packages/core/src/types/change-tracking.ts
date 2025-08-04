/**
 * Types for comprehensive devlog field change tracking
 */

import type { DevlogEntry, DevlogId } from './core.js';

/**
 * Types of changes that can be tracked
 */
export type ChangeType =
  | 'field-update' // Single field change
  | 'bulk-update' // Multiple fields changed at once
  | 'status-transition' // Status workflow change
  | 'creation' // Entry creation
  | 'archive' // Entry archiving
  | 'restoration'; // Entry restoration

/**
 * Categories of fields for different tracking strategies
 */
export type FieldCategory =
  | 'metadata' // title, type, priority, status, assignee
  | 'content' // description, businessContext, technicalContext
  | 'criteria' // acceptanceCriteria (existing special handling)
  | 'insights' // initialInsights, relatedPatterns
  | 'workflow' // status, closedAt, archived
  | 'system'; // createdAt, updatedAt (usually not tracked)

/**
 * Source of the change for attribution
 */
export type ChangeSource =
  | 'user' // Manual user update
  | 'ai-agent' // AI assistant update
  | 'system' // Automatic system update
  | 'api' // External API update
  | 'migration' // Data migration
  | 'batch'; // Batch operation

/**
 * Trackable fields and their metadata
 */
export interface TrackableField {
  name: keyof DevlogEntry;
  category: FieldCategory;
  diffStrategy: 'simple' | 'array' | 'object' | 'text';
  displayName: string;
  shouldTrack: boolean;
}

/**
 * Configuration for field tracking
 */
export const TRACKABLE_FIELDS: Record<string, TrackableField> = {
  title: {
    name: 'title',
    category: 'metadata',
    diffStrategy: 'simple',
    displayName: 'Title',
    shouldTrack: true,
  },
  description: {
    name: 'description',
    category: 'content',
    diffStrategy: 'text',
    displayName: 'Description',
    shouldTrack: true,
  },
  type: {
    name: 'type',
    category: 'metadata',
    diffStrategy: 'simple',
    displayName: 'Type',
    shouldTrack: true,
  },
  status: {
    name: 'status',
    category: 'workflow',
    diffStrategy: 'simple',
    displayName: 'Status',
    shouldTrack: true,
  },
  priority: {
    name: 'priority',
    category: 'metadata',
    diffStrategy: 'simple',
    displayName: 'Priority',
    shouldTrack: true,
  },
  assignee: {
    name: 'assignee',
    category: 'metadata',
    diffStrategy: 'simple',
    displayName: 'Assignee',
    shouldTrack: true,
  },
  businessContext: {
    name: 'businessContext',
    category: 'content',
    diffStrategy: 'text',
    displayName: 'Business Context',
    shouldTrack: true,
  },
  technicalContext: {
    name: 'technicalContext',
    category: 'content',
    diffStrategy: 'text',
    displayName: 'Technical Context',
    shouldTrack: true,
  },
  acceptanceCriteria: {
    name: 'acceptanceCriteria',
    category: 'criteria',
    diffStrategy: 'array',
    displayName: 'Acceptance Criteria',
    shouldTrack: true,
  },
  archived: {
    name: 'archived',
    category: 'workflow',
    diffStrategy: 'simple',
    displayName: 'Archived Status',
    shouldTrack: true,
  },
  // Fields that should NOT be tracked
  updatedAt: {
    name: 'updatedAt',
    category: 'system',
    diffStrategy: 'simple',
    displayName: 'Updated At',
    shouldTrack: false,
  },
  createdAt: {
    name: 'createdAt',
    category: 'system',
    diffStrategy: 'simple',
    displayName: 'Created At',
    shouldTrack: false,
  },
};

/**
 * Individual field change details
 */
export interface FieldChange {
  fieldName: keyof DevlogEntry;
  fieldDisplayName: string;
  category: FieldCategory;
  previousValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified' | 'reordered';
  diff?: string; // Human-readable diff
}

/**
 * Complete change record
 */
export interface ChangeRecord {
  id: string;
  devlogId: DevlogId;
  timestamp: string;
  changeType: ChangeType;
  source: ChangeSource;
  sourceDetails?: string; // e.g., "Claude via MCP", "GitHub Copilot", "User via Web UI"
  changes: FieldChange[];
  reason?: string; // Optional reason provided for the change
  metadata?: Record<string, any>; // Additional context
}

/**
 * Extended note metadata for change tracking
 */
export interface ChangeTrackingMetadata {
  // Existing AC metadata (from DevlogNote['metadata'])
  previousCriteria?: string[];
  newCriteria?: string[];
  changeType?: 'added' | 'removed' | 'modified' | 'reordered';

  // New comprehensive change metadata
  changeRecord?: ChangeRecord;
  fieldChanges?: FieldChange[];
  changeSource?: ChangeSource;
  changeReason?: string;

  // Allow any additional metadata
  [key: string]: any;
}

/**
 * Update request with change tracking context
 */
export interface TrackedUpdateRequest {
  // Standard update fields
  [key: string]: any;

  // Change tracking metadata
  _changeSource?: ChangeSource;
  _changeReason?: string;
  _sourceDetails?: string;
  _trackChanges?: boolean; // Allow disabling for specific updates
}

/**
 * Change history query options
 */
export interface ChangeHistoryFilter {
  devlogId?: DevlogId;
  fieldName?: keyof DevlogEntry;
  changeType?: ChangeType;
  source?: ChangeSource;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Change analytics data
 */
export interface ChangeAnalytics {
  totalChanges: number;
  changesByType: Record<ChangeType, number>;
  changesBySource: Record<ChangeSource, number>;
  changesByField: Record<string, number>;
  mostActiveEntries: Array<{ devlogId: DevlogId; changeCount: number; title: string }>;
  changeFrequency: Array<{ date: string; count: number }>;
}

/**
 * Rollback target specification
 */
export interface RollbackTarget {
  devlogId: DevlogId;
  targetTimestamp?: string; // Rollback to specific time
  targetChangeId?: string; // Rollback to specific change
  fieldsToRollback?: (keyof DevlogEntry)[]; // Specific fields only
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  rolledBackChanges: FieldChange[];
  newEntry: DevlogEntry;
  rollbackChangeRecord: ChangeRecord;
  error?: string;
}
