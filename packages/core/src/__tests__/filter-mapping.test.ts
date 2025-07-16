/**
 * Tests for filter mapping utilities
 */

import { describe, it, expect } from 'vitest';
import {
  FILTER_TYPE_TO_STATUSES,
  getStatusesForFilterType,
  isStatusInFilterType,
  getOpenStatuses,
  getClosedStatuses,
  getAllStatuses,
  isOpenStatus,
  isClosedStatus,
  getFilterTypeForStatus,
  filterTypeToStatusFilter,
} from '../utils/filter-mapping.js';
import type { DevlogStatus, FilterType } from '../types/core.js';

describe('Filter Mapping Utilities', () => {
  describe('FILTER_TYPE_TO_STATUSES', () => {
    it('should have correct open statuses', () => {
      expect(FILTER_TYPE_TO_STATUSES.open).toEqual([
        'new', 'in-progress', 'blocked', 'in-review', 'testing'
      ]);
    });

    it('should have correct closed statuses', () => {
      expect(FILTER_TYPE_TO_STATUSES.closed).toEqual([
        'done', 'cancelled'
      ]);
    });

    it('should have all statuses in total', () => {
      expect(FILTER_TYPE_TO_STATUSES.total).toEqual([
        'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
      ]);
    });

    it('should map individual statuses to themselves', () => {
      const individualStatuses: DevlogStatus[] = [
        'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
      ];

      individualStatuses.forEach(status => {
        expect(FILTER_TYPE_TO_STATUSES[status]).toEqual([status]);
      });
    });
  });

  describe('getStatusesForFilterType', () => {
    it('should return copy of status array for open', () => {
      const result = getStatusesForFilterType('open');
      expect(result).toEqual(['new', 'in-progress', 'blocked', 'in-review', 'testing']);
      // Should be a copy, not the same reference
      expect(result).not.toBe(FILTER_TYPE_TO_STATUSES.open);
    });

    it('should return copy for individual status', () => {
      const result = getStatusesForFilterType('new');
      expect(result).toEqual(['new']);
      expect(result).not.toBe(FILTER_TYPE_TO_STATUSES.new);
    });
  });

  describe('isStatusInFilterType', () => {
    it('should correctly identify open statuses', () => {
      expect(isStatusInFilterType('new', 'open')).toBe(true);
      expect(isStatusInFilterType('in-progress', 'open')).toBe(true);
      expect(isStatusInFilterType('testing', 'open')).toBe(true);
      expect(isStatusInFilterType('done', 'open')).toBe(false);
      expect(isStatusInFilterType('cancelled', 'open')).toBe(false);
    });

    it('should correctly identify closed statuses', () => {
      expect(isStatusInFilterType('done', 'closed')).toBe(true);
      expect(isStatusInFilterType('cancelled', 'closed')).toBe(true);
      expect(isStatusInFilterType('new', 'closed')).toBe(false);
      expect(isStatusInFilterType('in-progress', 'closed')).toBe(false);
    });

    it('should correctly identify total statuses', () => {
      const allStatuses: DevlogStatus[] = [
        'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
      ];

      allStatuses.forEach(status => {
        expect(isStatusInFilterType(status, 'total')).toBe(true);
      });
    });
  });

  describe('convenience functions', () => {
    it('getOpenStatuses should return open statuses', () => {
      expect(getOpenStatuses()).toEqual(['new', 'in-progress', 'blocked', 'in-review', 'testing']);
    });

    it('getClosedStatuses should return closed statuses', () => {
      expect(getClosedStatuses()).toEqual(['done', 'cancelled']);
    });

    it('getAllStatuses should return all statuses', () => {
      expect(getAllStatuses()).toEqual([
        'new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'
      ]);
    });
  });

  describe('status categorization functions', () => {
    it('isOpenStatus should correctly identify open statuses', () => {
      expect(isOpenStatus('new')).toBe(true);
      expect(isOpenStatus('in-progress')).toBe(true);
      expect(isOpenStatus('blocked')).toBe(true);
      expect(isOpenStatus('in-review')).toBe(true);
      expect(isOpenStatus('testing')).toBe(true);
      expect(isOpenStatus('done')).toBe(false);
      expect(isOpenStatus('cancelled')).toBe(false);
    });

    it('isClosedStatus should correctly identify closed statuses', () => {
      expect(isClosedStatus('done')).toBe(true);
      expect(isClosedStatus('cancelled')).toBe(true);
      expect(isClosedStatus('new')).toBe(false);
      expect(isClosedStatus('in-progress')).toBe(false);
      expect(isClosedStatus('blocked')).toBe(false);
    });

    it('getFilterTypeForStatus should return correct category', () => {
      expect(getFilterTypeForStatus('new')).toBe('open');
      expect(getFilterTypeForStatus('in-progress')).toBe('open');
      expect(getFilterTypeForStatus('blocked')).toBe('open');
      expect(getFilterTypeForStatus('in-review')).toBe('open');
      expect(getFilterTypeForStatus('testing')).toBe('open');
      expect(getFilterTypeForStatus('done')).toBe('closed');
      expect(getFilterTypeForStatus('cancelled')).toBe('closed');
    });
  });

  describe('filterTypeToStatusFilter', () => {
    it('should return undefined for total filter type', () => {
      expect(filterTypeToStatusFilter('total')).toBeUndefined();
    });

    it('should return status arrays for non-total filter types', () => {
      expect(filterTypeToStatusFilter('open')).toEqual(['new', 'in-progress', 'blocked', 'in-review', 'testing']);
      expect(filterTypeToStatusFilter('closed')).toEqual(['done', 'cancelled']);
      expect(filterTypeToStatusFilter('new')).toEqual(['new']);
      expect(filterTypeToStatusFilter('done')).toEqual(['done']);
    });
  });

  describe('consistency checks', () => {
    it('open and closed statuses should not overlap', () => {
      const openStatuses = getOpenStatuses();
      const closedStatuses = getClosedStatuses();
      
      const overlap = openStatuses.filter(status => closedStatuses.includes(status));
      expect(overlap).toEqual([]);
    });

    it('open and closed together should equal total', () => {
      const openStatuses = getOpenStatuses();
      const closedStatuses = getClosedStatuses();
      const allStatuses = getAllStatuses();
      
      const combined = [...openStatuses, ...closedStatuses].sort();
      const total = [...allStatuses].sort();
      
      expect(combined).toEqual(total);
    });

    it('every status should be categorized as either open or closed', () => {
      const allStatuses = getAllStatuses();
      
      allStatuses.forEach(status => {
        const isOpen = isOpenStatus(status);
        const isClosed = isClosedStatus(status);
        
        // Each status should be exactly one of open or closed
        expect(isOpen !== isClosed).toBe(true);
      });
    });
  });
});
