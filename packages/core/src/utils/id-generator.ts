/**
 * ID generation utilities for various entities
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate a unique ID using crypto random bytes and timestamp
 *
 * @param prefix - Optional prefix for the ID
 * @returns A unique string ID
 */
export function generateUniqueId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString('hex');
  
  if (prefix) {
    return `${prefix}-${timestamp}-${randomPart}`;
  }
  
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a hash-based ID from input data
 *
 * @param input - Input data to hash
 * @param length - Length of the resulting hash (default: 16)
 * @returns A hash-based ID
 */
export function generateHashId(input: string, length: number = 16): string {
  return createHash('sha256')
    .update(input)
    .digest('hex')
    .substring(0, length);
}

/**
 * Generate a document-specific ID with timestamp and random component
 *
 * @param devlogId - The devlog ID this document belongs to
 * @param originalName - The original filename
 * @returns A unique document ID
 */
export function generateDocumentId(devlogId: number, originalName: string): string {
  const input = `${devlogId}-${originalName}-${Date.now()}`;
  const hash = generateHashId(input, 12);
  return `doc-${hash}`;
}