import { formatDistanceToNow } from 'date-fns';

/**
 * Formats a date string to a human-readable "time ago" format
 * @param dateString - ISO date string
 * @returns Formatted string like "2 hours ago", "3 days ago", etc.
 */
export function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (error) {
    console.warn('Invalid date string:', dateString);
    return 'Invalid date';
  }
}

/**
 * Formats a date string to a human-readable "time ago" format with a tooltip showing the full date
 * @param dateString - ISO date string
 * @returns Object with timeAgo and fullDate for tooltip
 */
export function formatTimeAgoWithTooltip(dateString?: string): { timeAgo: string; fullDate: string } {
  if (!dateString) {
    return { timeAgo: 'N/A', fullDate: 'N/A' };
  }
  try {
    const date = new Date(dateString);
    return {
      timeAgo: formatDistanceToNow(date, { addSuffix: true }),
      fullDate: date.toLocaleString(),
    };
  } catch (error) {
    console.warn('Invalid date string:', dateString);
    return {
      timeAgo: 'Invalid date',
      fullDate: 'Invalid date',
    };
  }
}
