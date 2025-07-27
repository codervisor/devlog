/**
 * Utility functions for Acceptance Criteria change tracking
 */

import { DevlogNote } from '../types/index.js';

/**
 * Compare two arrays of acceptance criteria and determine what changed
 */
export function compareAcceptanceCriteria(
  previous: string[],
  current: string[],
): {
  changeType: 'added' | 'removed' | 'modified' | 'reordered';
  addedItems: string[];
  removedItems: string[];
  modifiedItems: Array<{ old: string; new: string }>;
} {
  const prevSet = new Set(previous);
  const currSet = new Set(current);

  const addedItems = current.filter((item) => !prevSet.has(item));
  const removedItems = previous.filter((item) => !currSet.has(item));

  // For simplicity, we'll treat any differences as modifications
  // More sophisticated diff logic could be added later
  const modifiedItems: Array<{ old: string; new: string }> = [];

  // Determine primary change type
  let changeType: 'added' | 'removed' | 'modified' | 'reordered';
  if (addedItems.length > 0 && removedItems.length === 0) {
    changeType = 'added';
  } else if (removedItems.length > 0 && addedItems.length === 0) {
    changeType = 'removed';
  } else if (addedItems.length > 0 || removedItems.length > 0) {
    changeType = 'modified';
  } else if (JSON.stringify(previous) !== JSON.stringify(current)) {
    changeType = 'reordered';
  } else {
    changeType = 'modified'; // fallback
  }

  return {
    changeType,
    addedItems,
    removedItems,
    modifiedItems,
  };
}

/**
 * Create a formatted note content for acceptance criteria changes
 */
export function createAcceptanceCriteriaChangeNote(
  previous: string[],
  current: string[],
  changeReason?: string,
): { content: string; metadata: DevlogNote['metadata'] } {
  const comparison = compareAcceptanceCriteria(previous, current);

  let content = '**Acceptance Criteria Updated**\n\n';

  if (changeReason) {
    content += `**Reason:** ${changeReason}\n\n`;
  }

  if (comparison.addedItems.length > 0) {
    content += '**Added:**\n';
    comparison.addedItems.forEach((item) => {
      content += `+ ${item}\n`;
    });
    content += '\n';
  }

  if (comparison.removedItems.length > 0) {
    content += '**Removed:**\n';
    comparison.removedItems.forEach((item) => {
      content += `- ${item}\n`;
    });
    content += '\n';
  }

  if (comparison.changeType === 'reordered') {
    content += '**Reordered acceptance criteria**\n\n';
  }

  content += '**Current Acceptance Criteria:**\n';
  current.forEach((item, index) => {
    content += `${index + 1}. ${item}\n`;
  });

  const metadata: DevlogNote['metadata'] = {
    previousCriteria: previous,
    newCriteria: current,
    changeType: comparison.changeType,
  };

  return { content, metadata };
}

/**
 * Helper to create a complete DevlogNote for AC changes
 */
export function createAcceptanceCriteriaNote(
  previous: string[],
  current: string[],
  changeReason?: string,
  changedBy?: string,
): Omit<DevlogNote, 'id' | 'timestamp'> {
  const { content, metadata } = createAcceptanceCriteriaChangeNote(previous, current, changeReason);

  return {
    category: 'acceptance-criteria',
    content,
    metadata,
  };
}
