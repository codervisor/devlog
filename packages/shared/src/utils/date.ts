/**
 * Date utility functions
 */

/**
 * Format a date to ISO string
 */
export function toISOString(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Get current timestamp as ISO string
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Get the difference in days between two dates
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date and time to a human-readable string
 */
export function formatDateTime(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const isPast = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const suffix = isPast ? 'ago' : 'from now';
  const prefix = isPast ? '' : 'in ';

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${prefix}${diffMin} minute${diffMin !== 1 ? 's' : ''} ${suffix}`.trim();
  } else if (diffHour < 24) {
    return `${prefix}${diffHour} hour${diffHour !== 1 ? 's' : ''} ${suffix}`.trim();
  } else if (diffDay < 30) {
    return `${prefix}${diffDay} day${diffDay !== 1 ? 's' : ''} ${suffix}`.trim();
  } else if (diffMonth < 12) {
    return `${prefix}${diffMonth} month${diffMonth !== 1 ? 's' : ''} ${suffix}`.trim();
  } else {
    return `${prefix}${diffYear} year${diffYear !== 1 ? 's' : ''} ${suffix}`.trim();
  }
}
