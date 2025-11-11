/**
 * String utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  toKebabCase,
  toCamelCase,
  toPascalCase,
  truncate,
  capitalize,
  isEmptyOrWhitespace,
  escapeHtml,
} from '../string.js';

describe('String Utilities', () => {
  describe('toKebabCase', () => {
    it('converts camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('converts PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('handles spaces', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
    });

    it('handles underscores', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world');
    });
  });

  describe('toCamelCase', () => {
    it('converts kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('converts snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('handles spaces', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });
  });

  describe('toPascalCase', () => {
    it('converts kebab-case to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
    });

    it('converts camelCase to PascalCase', () => {
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('does not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('uses custom suffix', () => {
      expect(truncate('Hello World', 8, '…')).toBe('Hello W…');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('keeps other letters unchanged', () => {
      expect(capitalize('hELLO')).toBe('HELLO');
    });
  });

  describe('isEmptyOrWhitespace', () => {
    it('returns true for empty string', () => {
      expect(isEmptyOrWhitespace('')).toBe(true);
    });

    it('returns true for whitespace only', () => {
      expect(isEmptyOrWhitespace('   ')).toBe(true);
    });

    it('returns true for null', () => {
      expect(isEmptyOrWhitespace(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isEmptyOrWhitespace(undefined)).toBe(true);
    });

    it('returns false for non-empty string', () => {
      expect(isEmptyOrWhitespace('hello')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<div>Test & "quote"</div>')).toBe(
        '&lt;div&gt;Test &amp; &quot;quote&quot;&lt;&#x2F;div&gt;'
      );
    });

    it('handles single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#x27;s a test');
    });
  });
});
