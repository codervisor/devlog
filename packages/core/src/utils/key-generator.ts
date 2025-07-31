/**
 * Semantic key generation utility
 * Generates kebab-case keys with hash suffixes to ensure uniqueness
 */

import { createHash } from 'crypto';

/**
 * Generate a semantic key from title with hash suffix for uniqueness
 *
 * @param title - The title to generate a key from
 * @param hashInput - Additional input for hash generation (e.g., description, timestamp)
 * @returns A semantic key in kebab-case format with hash suffix
 *
 * @example
 * generateSemanticKey("Fix Authentication Bug")
 * // Returns: "fix-authentication-bug-a1b2c3d4"
 *
 * generateSemanticKey("Test Long Title", "some additional context")
 * // Returns: "test-long-title-e5f6g7h8"
 */
export function generateSemanticKey(title: string, hashInput?: string): string {
  // 1. Create semantic base from title
  const semanticBase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 40); // Limit base to reasonable length

  // 2. Generate hash suffix for uniqueness
  const hashSource = hashInput ? `${title}-${hashInput}-${Date.now()}` : `${title}-${Date.now()}`;

  const hash = createHash('sha256').update(hashSource).digest('hex').substring(0, 8); // Use first 8 characters

  // 3. Combine semantic base with hash suffix
  return `${semanticBase}-${hash}`;
}

/**
 * Generate a key from a title with additional context for uniqueness
 *
 * @param title - The main title
 * @param type - The entry type (feature, bugfix, etc.)
 * @param description - Optional description for additional context
 * @returns A semantic key with hash suffix
 */
export function generateDevlogKey(title: string, type: string, description?: string): string {
  const contextInput = description ? `${type}-${description}` : type;

  return generateSemanticKey(title, contextInput);
}

/**
 * Validate that a key meets the required format
 *
 * @param key - The key to validate
 * @returns True if key is valid
 */
export function isValidKey(key: string): boolean {
  // Key should be kebab-case with optional hash suffix
  const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return keyPattern.test(key) && key.length <= 255;
}

/**
 * Extract the semantic part (without hash) from a generated key
 *
 * @param key - The generated key
 * @returns The semantic part of the key
 */
export function extractSemanticPart(key: string): string {
  // Remove the last segment if it looks like a hash (8 hex chars)
  const parts = key.split('-');
  const lastPart = parts[parts.length - 1];

  if (lastPart.length === 8 && /^[a-f0-9]+$/.test(lastPart)) {
    return parts.slice(0, -1).join('-');
  }

  return key;
}
