/**
 * Devlog status constants
 */

import type {
  DevlogStatus,
  DevlogType,
  DevlogPriority,
  DevlogNoteCategory,
} from '../types/devlog.js';

/**
 * All possible devlog statuses
 */
export const DEVLOG_STATUSES: readonly DevlogStatus[] = [
  'new',
  'in-progress',
  'blocked',
  'in-review',
  'testing',
  'done',
  'cancelled',
] as const;

/**
 * Open/active statuses (work in progress)
 */
export const OPEN_STATUSES: readonly DevlogStatus[] = [
  'new',
  'in-progress',
  'blocked',
  'in-review',
  'testing',
] as const;

/**
 * Closed statuses (work completed or abandoned)
 */
export const CLOSED_STATUSES: readonly DevlogStatus[] = ['done', 'cancelled'] as const;

/**
 * All possible devlog types
 */
export const DEVLOG_TYPES: readonly DevlogType[] = [
  'feature',
  'bugfix',
  'task',
  'refactor',
  'docs',
] as const;

/**
 * All possible priority levels
 */
export const DEVLOG_PRIORITIES: readonly DevlogPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

/**
 * All possible note categories
 */
export const DEVLOG_NOTE_CATEGORIES: readonly DevlogNoteCategory[] = [
  'progress',
  'issue',
  'solution',
  'idea',
  'reminder',
  'feedback',
  'acceptance-criteria',
] as const;

/**
 * Check if a status is open/active
 */
export function isOpenStatus(status: DevlogStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/**
 * Check if a status is closed
 */
export function isClosedStatus(status: DevlogStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}
