/**
 * Filter mapping utilities for devlog status and type filtering
 *
 * This module provides centralized mapping between FilterType values and their
 * corresponding DevlogStatus arrays, eliminating hardcoded status arrays
 * throughout the codebase.
 */

import type { DevlogStatus, FilterType } from '../types/index.js';

/**
 * Mapping of filter types to their corresponding status arrays
 *
 * This is the single source of truth for status groupings:
 * - 'open': Statuses representing active/in-progress work
 * - 'closed': Statuses representing completed/finished work
 * - 'total': All possible statuses
 * - Individual statuses: Return array with single status
 */
export const FILTER_TYPE_TO_STATUSES: Record<FilterType, DevlogStatus[]> = {
  // Aggregate categories
  open: ['new', 'in-progress', 'blocked', 'in-review', 'testing'],
  closed: ['done', 'cancelled'],
  total: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'],

  // Individual statuses (each maps to itself)
  new: ['new'],
  'in-progress': ['in-progress'],
  blocked: ['blocked'],
  'in-review': ['in-review'],
  testing: ['testing'],
  done: ['done'],
  cancelled: ['cancelled'],
} as const;

/**
 * Get the status array for a given filter type
 *
 * @param filterType - The filter type to map to statuses
 * @returns Array of DevlogStatus values corresponding to the filter type
 *
 * @example
 * ```typescript
 * const openStatuses = getStatusesForFilterType('open');
 * // Returns: ['new', 'in-progress', 'blocked', 'in-review', 'testing']
 *
 * const newStatuses = getStatusesForFilterType('new');
 * // Returns: ['new']
 * ```
 */
export function getStatusesForFilterType(filterType: FilterType): DevlogStatus[] {
  return [...FILTER_TYPE_TO_STATUSES[filterType]];
}

/**
 * Check if a status belongs to a specific filter type category
 *
 * @param status - The DevlogStatus to check
 * @param filterType - The FilterType category to check against
 * @returns True if the status belongs to the filter type category
 *
 * @example
 * ```typescript
 * const isOpen = isStatusInFilterType('in-progress', 'open');
 * // Returns: true
 *
 * const isClosed = isStatusInFilterType('in-progress', 'closed');
 * // Returns: false
 * ```
 */
export function isStatusInFilterType(status: DevlogStatus, filterType: FilterType): boolean {
  return FILTER_TYPE_TO_STATUSES[filterType].includes(status);
}

/**
 * Get all open statuses (shorthand for getStatusesForFilterType('open'))
 *
 * @returns Array of DevlogStatus values representing open/active work
 */
export function getOpenStatuses(): DevlogStatus[] {
  return getStatusesForFilterType('open');
}

/**
 * Get all closed statuses (shorthand for getStatusesForFilterType('closed'))
 *
 * @returns Array of DevlogStatus values representing closed/finished work
 */
export function getClosedStatuses(): DevlogStatus[] {
  return getStatusesForFilterType('closed');
}

/**
 * Get all possible statuses (shorthand for getStatusesForFilterType('total'))
 *
 * @returns Array of all DevlogStatus values
 */
export function getAllStatuses(): DevlogStatus[] {
  return getStatusesForFilterType('total');
}

/**
 * Check if a status represents open/active work
 *
 * @param status - The DevlogStatus to check
 * @returns True if the status represents open work
 */
export function isOpenStatus(status: DevlogStatus): boolean {
  return isStatusInFilterType(status, 'open');
}

/**
 * Check if a status represents closed/finished work
 *
 * @param status - The DevlogStatus to check
 * @returns True if the status represents closed work
 */
export function isClosedStatus(status: DevlogStatus): boolean {
  return isStatusInFilterType(status, 'closed');
}

/**
 * Get the filter type category for a given status
 *
 * @param status - The DevlogStatus to categorize
 * @returns The FilterType category ('open' or 'closed') for the status
 *
 * @example
 * ```typescript
 * const category = getFilterTypeForStatus('in-progress');
 * // Returns: 'open'
 *
 * const category = getFilterTypeForStatus('done');
 * // Returns: 'closed'
 * ```
 */
export function getFilterTypeForStatus(status: DevlogStatus): 'open' | 'closed' {
  return isOpenStatus(status) ? 'open' : 'closed';
}

/**
 * Convert a FilterType to an appropriate status array for filtering operations
 * This is the main function to use when applying filters in storage/manager layers
 *
 * @param filterType - The FilterType to convert
 * @returns Array of DevlogStatus values for filtering, or undefined if 'total' (no filtering needed)
 *
 * @example
 * ```typescript
 * // For filtering operations
 * const statusFilter = filterTypeToStatusFilter('open');
 * // Returns: ['new', 'in-progress', 'blocked', 'in-review', 'testing']
 *
 * const totalFilter = filterTypeToStatusFilter('total');
 * // Returns: undefined (no status filtering needed for 'total')
 * ```
 */
export function filterTypeToStatusFilter(filterType: FilterType): DevlogStatus[] | undefined {
  // For 'total', return undefined to indicate no status filtering is needed
  if (filterType === 'total') {
    return undefined;
  }

  return getStatusesForFilterType(filterType);
}
