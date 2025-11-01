/**
 * Validation utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isValidIsoDate,
  isNonEmptyString,
  isPositiveInteger,
  isInRange,
  isOneOf,
} from '../validation.js';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('validates correct email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('validates correct URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('rejects invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('invalid url')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('validates correct UUID', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('rejects invalid UUID', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('isValidIsoDate', () => {
    it('validates correct ISO date', () => {
      expect(isValidIsoDate('2025-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidIsoDate('2025-01-01T00:00:00Z')).toBe(true);
    });

    it('rejects invalid ISO date', () => {
      expect(isValidIsoDate('2025-01-01')).toBe(false);
      expect(isValidIsoDate('not-a-date')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for empty or whitespace', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('returns true for positive integers', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
    });

    it('returns false for non-positive or non-integers', () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(1.5)).toBe(false);
      expect(isPositiveInteger('1')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('checks if value is in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('returns false for out of range', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('isOneOf', () => {
    it('checks if value is in allowed list', () => {
      expect(isOneOf('a', ['a', 'b', 'c'])).toBe(true);
    });

    it('returns false if not in list', () => {
      expect(isOneOf('d', ['a', 'b', 'c'])).toBe(false);
    });
  });
});
