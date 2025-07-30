/**
 * Comprehensive field change tracking utilities
 * Extends the existing acceptance criteria tracking to all devlog fields
 */

import type { DevlogEntry, DevlogNote, NoteCategory } from '../types/core.js';
import type {
  ChangeRecord,
  FieldChange,
  ChangeType,
  ChangeSource,
  TrackableField,
  TrackedUpdateRequest,
  ChangeTrackingMetadata,
} from '../types/change-tracking.js';
import { TRACKABLE_FIELDS } from '../types/change-tracking.js';

/**
 * Compare two values and generate a field change record
 */
export function createFieldChange(
  fieldName: keyof DevlogEntry,
  previousValue: any,
  newValue: any,
): FieldChange | null {
  const fieldConfig = TRACKABLE_FIELDS[fieldName as string];

  if (!fieldConfig || !fieldConfig.shouldTrack) {
    return null; // Skip untrackable fields
  }

  // Skip if values are the same
  if (JSON.stringify(previousValue) === JSON.stringify(newValue)) {
    return null;
  }

  const change: FieldChange = {
    fieldName,
    fieldDisplayName: fieldConfig.displayName,
    category: fieldConfig.category,
    previousValue,
    newValue,
    changeType: determineChangeType(previousValue, newValue, fieldConfig.diffStrategy),
    diff: generateDiff(previousValue, newValue, fieldConfig.diffStrategy),
  };

  return change;
}

/**
 * Determine the type of change based on previous and new values
 */
function determineChangeType(
  previousValue: any,
  newValue: any,
  diffStrategy: TrackableField['diffStrategy'],
): FieldChange['changeType'] {
  if (previousValue === undefined || previousValue === null) {
    return 'added';
  }
  if (newValue === undefined || newValue === null) {
    return 'removed';
  }

  if (diffStrategy === 'array' && Array.isArray(previousValue) && Array.isArray(newValue)) {
    // Check if it's just reordering
    const prevSorted = [...previousValue].sort();
    const newSorted = [...newValue].sort();
    if (JSON.stringify(prevSorted) === JSON.stringify(newSorted)) {
      return 'reordered';
    }
  }

  return 'modified';
}

/**
 * Generate human-readable diff for different field types
 */
function generateDiff(
  previousValue: any,
  newValue: any,
  diffStrategy: TrackableField['diffStrategy'],
): string {
  switch (diffStrategy) {
    case 'simple':
      return `Changed from "${previousValue}" to "${newValue}"`;

    case 'text':
      return generateTextDiff(previousValue, newValue);

    case 'array':
      return generateArrayDiff(previousValue, newValue);

    case 'object':
      return generateObjectDiff(previousValue, newValue);

    default:
      return `Updated value`;
  }
}

/**
 * Generate diff for text fields (description, context fields)
 */
function generateTextDiff(previousValue: string, newValue: string): string {
  if (!previousValue) return `Added: "${newValue}"`;
  if (!newValue) return `Removed: "${previousValue}"`;

  // For long text, show a summary
  const prevLines = previousValue.split('\n').length;
  const newLines = newValue.split('\n').length;
  const prevLength = previousValue.length;
  const newLength = newValue.length;

  if (prevLines !== newLines || Math.abs(prevLength - newLength) > 50) {
    return `Text updated (${prevLines} → ${newLines} lines, ${prevLength} → ${newLength} chars)`;
  }

  return `Text modified`;
}

/**
 * Generate diff for array fields (acceptance criteria, insights, etc.)
 */
function generateArrayDiff(previousValue: any[], newValue: any[]): string {
  if (!previousValue) previousValue = [];
  if (!newValue) newValue = [];

  const prevSet = new Set(previousValue);
  const newSet = new Set(newValue);

  const added = newValue.filter((item) => !prevSet.has(item));
  const removed = previousValue.filter((item) => !newSet.has(item));

  // For detailed diff (especially useful for acceptance criteria)
  let diff = '';

  if (added.length > 0) {
    diff += `**Added:**\n${added.map((item) => `+ ${item}`).join('\n')}\n\n`;
  }

  if (removed.length > 0) {
    diff += `**Removed:**\n${removed.map((item) => `- ${item}`).join('\n')}\n\n`;
  }

  if (added.length === 0 && removed.length === 0) {
    // Items were reordered
    diff = 'Items reordered';
  } else if (diff) {
    // Add summary
    const parts: string[] = [];
    if (added.length > 0) parts.push(`+${added.length} added`);
    if (removed.length > 0) parts.push(`-${removed.length} removed`);
    diff = `${parts.join(', ')}\n\n${diff}`;
  }

  return diff.trim();
}

/**
 * Generate diff for object fields
 */
function generateObjectDiff(previousValue: any, newValue: any): string {
  if (!previousValue) return 'Object added';
  if (!newValue) return 'Object removed';
  return 'Object updated';
}

/**
 * Detect all field changes between two devlog entries
 */
export function detectFieldChanges(
  previousEntry: DevlogEntry,
  updatedEntry: DevlogEntry,
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Check all trackable fields
  for (const [fieldName, fieldConfig] of Object.entries(TRACKABLE_FIELDS)) {
    if (!fieldConfig.shouldTrack) continue;

    const change = createFieldChange(
      fieldName as keyof DevlogEntry,
      previousEntry[fieldName as keyof DevlogEntry],
      updatedEntry[fieldName as keyof DevlogEntry],
    );

    if (change) {
      changes.push(change);
    }
  }

  return changes;
}

/**
 * Create a comprehensive change record
 */
export function createChangeRecord(
  devlogId: number,
  changes: FieldChange[],
  changeType: ChangeType,
  source: ChangeSource,
  options: {
    reason?: string;
    sourceDetails?: string;
    metadata?: Record<string, any>;
  } = {},
): ChangeRecord {
  return {
    id: crypto.randomUUID(),
    devlogId,
    timestamp: new Date().toISOString(),
    changeType,
    source,
    sourceDetails: options.sourceDetails,
    changes,
    reason: options.reason,
    metadata: options.metadata,
  };
}

/**
 * Create a change tracking note from field changes
 */
export function createFieldChangeNote(
  changes: FieldChange[],
  changeRecord: ChangeRecord,
): Omit<DevlogNote, 'id' | 'timestamp'> {
  const content = generateChangeNoteContent(changes, changeRecord);
  const category = determineNoteCategory(changes);

  const metadata: ChangeTrackingMetadata = {
    changeRecord,
    fieldChanges: changes,
    changeSource: changeRecord.source,
    changeReason: changeRecord.reason,
  };

  return {
    category,
    content,
  };
}

/**
 * Generate human-readable content for change notes
 */
function generateChangeNoteContent(changes: FieldChange[], changeRecord: ChangeRecord): string {
  let content = '**Field Changes**\n\n';

  if (changeRecord.reason) {
    content += `**Reason:** ${changeRecord.reason}\n\n`;
  }

  if (changeRecord.sourceDetails) {
    content += `**Source:** ${changeRecord.sourceDetails}\n\n`;
  }

  // Group changes by category
  const changesByCategory = changes.reduce(
    (acc, change) => {
      if (!acc[change.category]) acc[change.category] = [];
      acc[change.category].push(change);
      return acc;
    },
    {} as Record<string, FieldChange[]>,
  );

  for (const [category, categoryChanges] of Object.entries(changesByCategory)) {
    content += `**${category.charAt(0).toUpperCase() + category.slice(1)} Changes:**\n`;

    for (const change of categoryChanges) {
      content += `- **${change.fieldDisplayName}**: ${change.diff}\n`;
    }
    content += '\n';
  }

  return content.trim();
}

/**
 * Determine the appropriate note category for field changes
 */
function determineNoteCategory(changes: FieldChange[]): NoteCategory {
  // Check if any workflow changes (status, archived, etc.)
  const hasWorkflowChanges = changes.some((c) => c.category === 'workflow');
  if (hasWorkflowChanges) {
    return 'progress';
  }

  // Check if any content changes
  const hasContentChanges = changes.some((c) => c.category === 'content');
  if (hasContentChanges) {
    return 'progress';
  }

  // Default to progress for most field changes
  return 'progress';
}

/**
 * Extract change tracking context from update request
 */
export function extractChangeContext(updateRequest: TrackedUpdateRequest): {
  source: ChangeSource;
  sourceDetails?: string;
  reason?: string;
  trackChanges: boolean;
} {
  return {
    source: updateRequest._changeSource || 'user',
    sourceDetails: updateRequest._sourceDetails,
    reason: updateRequest._changeReason,
    trackChanges: updateRequest._trackChanges !== false, // Default to true
  };
}

/**
 * Remove change tracking metadata from update request
 */
export function cleanUpdateRequest(updateRequest: TrackedUpdateRequest): any {
  const cleaned = { ...updateRequest };
  delete cleaned._changeSource;
  delete cleaned._changeReason;
  delete cleaned._sourceDetails;
  delete cleaned._trackChanges;
  return cleaned;
}

/**
 * Check if a field should be tracked based on configuration
 */
export function shouldTrackField(fieldName: keyof DevlogEntry): boolean {
  const fieldConfig = TRACKABLE_FIELDS[fieldName as string];
  return fieldConfig?.shouldTrack || false;
}

/**
 * Get all trackable field names
 */
export function getTrackableFields(): (keyof DevlogEntry)[] {
  return Object.entries(TRACKABLE_FIELDS)
    .filter(([_, config]) => config.shouldTrack)
    .map(([fieldName]) => fieldName as keyof DevlogEntry);
}

/**
 * Validate that a rollback is safe (no conflicts with newer changes)
 */
export function validateRollback(
  targetEntry: DevlogEntry,
  changesSinceTarget: ChangeRecord[],
): { isValid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  // Check for conflicts in changed fields
  const targetFields = new Set(
    changesSinceTarget.flatMap((record) => record.changes.map((change) => change.fieldName)),
  );

  // Simple validation - can be enhanced with more sophisticated conflict detection
  if (targetFields.size > 0) {
    conflicts.push(`Fields modified since target: ${Array.from(targetFields).join(', ')}`);
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
  };
}
