/**
 * Project name utilities following GitHub repository naming conventions
 */

/**
 * Normalize user input to create a valid GitHub-style project name
 * - Converts to lowercase for consistency
 * - Replaces spaces and dots with hyphens
 * - Removes invalid characters
 * - Handles edge cases like multiple hyphens
 */
export function normalizeProjectName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .toLowerCase()
    .trim()
    .replace(/[\s.]+/g, '-') // Replace spaces and dots with hyphens
    .replace(/[^a-z0-9\-_]/g, '') // Remove invalid characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
    .slice(0, 100); // Ensure max length
}

/**
 * Generate a URL-safe slug from a project name for routing purposes.
 * Handles normalization and ensures the result is valid for GitHub conventions.
 */
export function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Project name is required to generate slug');
  }

  const normalized = normalizeProjectName(name);

  // If normalization results in empty string, use fallback
  if (!normalized) {
    return 'untitled-project';
  }

  return normalized;
}

/**
 * Validate a project display name following GitHub repository naming rules:
 * - Can only contain ASCII letters, digits, and the characters -, ., and _
 * - Must not be empty
 * - Length between 1-100 characters
 */
export function validateProjectDisplayName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Must contain only ASCII letters, digits, hyphens, dots, and underscores
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return false;
  }

  // Must have at least one character
  if (name.length === 0) {
    return false;
  }

  // Reasonable length limit (GitHub uses 100)
  if (name.length > 100) {
    return false;
  }

  return true;
}

/**
 * Validate a project name follows strict GitHub repository naming conventions for slugs:
 * - Can contain letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_)
 * - Cannot start or end with hyphens
 * - Cannot have consecutive hyphens
 * - Must not be empty
 * - Length between 1-100 characters
 */
export function validateProjectName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Must contain only letters, numbers, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return false;
  }

  // Cannot start or end with hyphens
  if (name.startsWith('-') || name.endsWith('-')) {
    return false;
  }

  // Cannot have consecutive hyphens
  if (name.includes('--')) {
    return false;
  }

  // Must have at least one character
  if (name.length === 0) {
    return false;
  }

  // Reasonable length limit (GitHub uses 100)
  if (name.length > 100) {
    return false;
  }

  return true;
}

/**
 * Validate if a string is a valid GitHub-style project slug (lowercase only)
 */
export function validateProjectSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Must be lowercase only for URL consistency
  if (slug !== slug.toLowerCase()) {
    return false;
  }

  // Use the same rules as project name validation
  return validateProjectName(slug);
}

/**
 * Generate a unique project name by appending numbers if needed
 * This handles case-insensitive collisions and works with display names
 */
export function generateUniqueProjectName(baseName: string, existingNames: string[]): string {
  if (!validateProjectDisplayName(baseName)) {
    throw new Error(`Base name "${baseName}" does not follow project naming conventions`);
  }

  // Convert existing names to lowercase for case-insensitive comparison
  const existingLowercase = existingNames.map((name) => name.toLowerCase());
  const baseLowercase = baseName.toLowerCase();

  if (!existingLowercase.includes(baseLowercase)) {
    return baseName;
  }

  // Try appending numbers until we find a unique name
  let counter = 1;
  let uniqueName: string;

  do {
    uniqueName = `${baseName} ${counter}`;
    counter++;
  } while (existingLowercase.includes(uniqueName.toLowerCase()) && counter < 1000);

  if (counter >= 1000) {
    throw new Error('Unable to generate unique project name after 1000 attempts');
  }

  return uniqueName;
}

/**
 * Check if a string is a valid project name identifier (name only, no numeric IDs)
 */
export function isValidProjectIdentifier(identifier: string): {
  type: 'name';
  valid: boolean;
} {
  // Explicitly reject purely numeric strings (former IDs)
  const numericId = parseInt(identifier, 10);
  if (!isNaN(numericId) && numericId.toString() === identifier) {
    return { type: 'name', valid: false };
  }

  // Only accept valid project display names
  if (validateProjectDisplayName(identifier)) {
    return { type: 'name', valid: true };
  }

  return { type: 'name', valid: false };
}

/**
 * Check if two project names are the same (case-insensitive)
 */
export function areProjectNamesEqual(name1: string, name2: string): boolean {
  return name1.toLowerCase() === name2.toLowerCase();
}
