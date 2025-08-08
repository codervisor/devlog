/**
 * Project name utilities following GitHub repository naming conventions
 */

/**
 * Generate a URL-safe slug from a project name for routing purposes.
 * GitHub allows mixed case but we'll use lowercase for URL consistency.
 */
export function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Project name is required to generate slug');
  }

  return name.toLowerCase();
}

/**
 * Validate a project name follows GitHub repository naming conventions:
 * - Can contain letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_)
 * - Cannot start or end with hyphens
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
 * Generate a unique project name by appending numbers if needed
 * This handles case-insensitive collisions
 */
export function generateUniqueProjectName(
  baseName: string,
  existingNames: string[]
): string {
  if (!validateProjectName(baseName)) {
    throw new Error(`Base name "${baseName}" does not follow GitHub naming conventions`);
  }
  
  // Convert existing names to lowercase for case-insensitive comparison
  const existingLowercase = existingNames.map(name => name.toLowerCase());
  const baseLowercase = baseName.toLowerCase();
  
  if (!existingLowercase.includes(baseLowercase)) {
    return baseName;
  }

  // Try appending numbers until we find a unique name
  let counter = 1;
  let uniqueName: string;
  
  do {
    uniqueName = `${baseName}-${counter}`;
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

  // Only accept valid project names
  if (validateProjectName(identifier)) {
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
