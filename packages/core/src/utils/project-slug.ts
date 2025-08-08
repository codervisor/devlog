/**
 * Project name utilities following GitHub repository naming conventions
 * Names serve as both display names and URL slugs
 */

/**
 * Generate a valid project name following GitHub naming rules:
 * - Lowercase only (for URL compatibility)
 * - Replace spaces with hyphens
 * - Remove invalid characters (keep only a-z, 0-9, hyphens, underscores)
 * - Remove leading/trailing hyphens
 * - Collapse consecutive hyphens
 * - Must not be empty
 */
export function normalizeProjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Project name is required');
  }

  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9\-_]/g, '')   // remove invalid chars (keep only a-z0-9-_)
    .replace(/^-+|-+$/g, '')        // trim leading/trailing hyphens
    .replace(/-+/g, '-');           // collapse consecutive hyphens

  if (!normalized) {
    throw new Error('Project name must contain at least one valid character (a-z, 0-9, -, _)');
  }

  return normalized;
}

/**
 * Validate a project name follows GitHub repository naming conventions
 */
export function validateProjectName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Must contain only lowercase letters, numbers, hyphens, underscores
  if (!/^[a-z0-9_-]+$/.test(name)) {
    return false;
  }

  // Cannot start or end with hyphens
  if (name.startsWith('-') || name.endsWith('-')) {
    return false;
  }

  // Must have at least one character
  if (name.length === 0) {
    return false;
  }

  // Reasonable length limit (GitHub uses 100, we'll match that)
  if (name.length > 100) {
    return false;
  }

  return true;
}

/**
 * Generate a unique project name by appending numbers if needed
 */
export function generateUniqueProjectName(
  baseName: string,
  existingNames: string[]
): string {
  const normalizedName = normalizeProjectName(baseName);
  
  if (!existingNames.includes(normalizedName)) {
    return normalizedName;
  }

  // Try appending numbers until we find a unique name
  let counter = 1;
  let uniqueName: string;
  
  do {
    uniqueName = `${normalizedName}-${counter}`;
    counter++;
  } while (existingNames.includes(uniqueName) && counter < 1000);

  if (counter >= 1000) {
    throw new Error('Unable to generate unique project name after 1000 attempts');
  }

  return uniqueName;
}

/**
 * Check if a string could be a project identifier (either numeric ID or valid name)
 */
export function isValidProjectIdentifier(identifier: string): {
  type: 'id' | 'name';
  valid: boolean;
} {
  // Check if it's a valid numeric ID
  const numericId = parseInt(identifier, 10);
  if (!isNaN(numericId) && numericId > 0 && numericId.toString() === identifier) {
    return { type: 'id', valid: true };
  }

  // Check if it's a valid project name
  if (validateProjectName(identifier)) {
    return { type: 'name', valid: true };
  }

  return { type: 'name', valid: false };
}
