/**
 * Utilities for querying and analyzing devlog change history
 */

import type {
  DevlogEntry,
  DevlogNote,
  ChangeRecord,
  FieldChange,
  ChangeHistoryFilter,
  ChangeAnalytics,
  ChangeTrackingMetadata,
} from '../types/index.js';

/**
 * Extract change records from devlog notes
 */
export function extractChangeRecords(entry: DevlogEntry): ChangeRecord[] {
  // TODO: Change tracking functionality removed with metadata simplification
  // This could be reimplemented using note content parsing or separate change log
  return [];
}

/**
 * Get field change history for a specific field
 */
export function getFieldHistory(
  entry: DevlogEntry,
  fieldName: keyof DevlogEntry,
): Array<{
  timestamp: string;
  previousValue: any;
  newValue: any;
  source: string;
  reason?: string;
}> {
  const changeRecords = extractChangeRecords(entry);

  return changeRecords
    .flatMap((record) =>
      record.changes
        .filter((change) => change.fieldName === fieldName)
        .map((change) => ({
          timestamp: record.timestamp,
          previousValue: change.previousValue,
          newValue: change.newValue,
          source: record.sourceDetails || record.source,
          reason: record.reason,
        })),
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get all field changes for an entry, grouped by timestamp
 */
export function getChangeTimeline(entry: DevlogEntry): Array<{
  timestamp: string;
  changeType: string;
  source: string;
  reason?: string;
  changes: FieldChange[];
}> {
  const changeRecords = extractChangeRecords(entry);

  return changeRecords
    .map((record) => ({
      timestamp: record.timestamp,
      changeType: record.changeType,
      source: record.sourceDetails || record.source,
      reason: record.reason,
      changes: record.changes,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Find the most recent value for a field at a specific timestamp
 */
export function getFieldValueAtTime(
  entry: DevlogEntry,
  fieldName: keyof DevlogEntry,
  targetTimestamp: string,
): any {
  const history = getFieldHistory(entry, fieldName);
  const targetTime = new Date(targetTimestamp).getTime();

  // Find the last change before or at the target time
  let lastValue = undefined;
  for (const change of history) {
    const changeTime = new Date(change.timestamp).getTime();
    if (changeTime <= targetTime) {
      lastValue = change.newValue;
    } else {
      break;
    }
  }

  return lastValue !== undefined ? lastValue : entry[fieldName];
}

/**
 * Generate a summary of changes made by different sources
 */
export function getChangesSummary(entry: DevlogEntry): {
  totalChanges: number;
  changesBySource: Record<string, number>;
  mostActiveField: string;
  fieldChangeCounts: Record<string, number>;
} {
  const changeRecords = extractChangeRecords(entry);
  const changesBySource: Record<string, number> = {};
  const fieldChangeCounts: Record<string, number> = {};

  let totalChanges = 0;

  for (const record of changeRecords) {
    const source = record.sourceDetails || record.source;
    changesBySource[source] = (changesBySource[source] || 0) + 1;

    for (const change of record.changes) {
      const fieldName = change.fieldName.toString();
      fieldChangeCounts[fieldName] = (fieldChangeCounts[fieldName] || 0) + 1;
      totalChanges++;
    }
  }

  const mostActiveField =
    Object.entries(fieldChangeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

  return {
    totalChanges,
    changesBySource,
    mostActiveField,
    fieldChangeCounts,
  };
}

/**
 * Generate human-readable change summary for display
 */
export function formatChangeSummary(entry: DevlogEntry): string {
  const summary = getChangesSummary(entry);

  if (summary.totalChanges === 0) {
    return 'No tracked changes';
  }

  const lines = [
    `**Change Summary for "${entry.title}"**`,
    `- Total field changes: ${summary.totalChanges}`,
    `- Most modified field: ${summary.mostActiveField} (${summary.fieldChangeCounts[summary.mostActiveField]} changes)`,
    '',
    '**Changes by source:**',
  ];

  for (const [source, count] of Object.entries(summary.changesBySource)) {
    lines.push(`- ${source}: ${count} updates`);
  }

  return lines.join('\n');
}

/**
 * Check if a devlog entry has any tracked changes
 */
export function hasTrackedChanges(entry: DevlogEntry): boolean {
  return extractChangeRecords(entry).length > 0;
}

/**
 * Get the last person/system that modified a specific field
 */
export function getLastModifier(
  entry: DevlogEntry,
  fieldName: keyof DevlogEntry,
): {
  source: string;
  timestamp: string;
  reason?: string;
} | null {
  const history = getFieldHistory(entry, fieldName);
  const lastChange = history[history.length - 1];

  if (!lastChange) return null;

  return {
    source: lastChange.source,
    timestamp: lastChange.timestamp,
    reason: lastChange.reason,
  };
}
