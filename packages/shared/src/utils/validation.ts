/**
 * Validation utility functions
 */

/**
 * Check if a value is a valid email address
 * 
 * Note: Uses a simplified but safe regex that avoids ReDoS vulnerabilities.
 * For production use, consider using a library like `validator` for comprehensive validation.
 */
export function isValidEmail(email: string): boolean {
  // Simplified regex that is safe from ReDoS attacks
  // Matches: local-part@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check if a value is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if a value is a valid ISO date string
 */
export function isValidIsoDate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(date)) {
    return false;
  }
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a positive integer
 */
export function isPositiveInteger(value: any): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Check if a value is within a range (inclusive)
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate that a value is one of the allowed values
 */
export function isOneOf<T>(value: T, allowed: readonly T[]): boolean {
  return allowed.includes(value);
}
