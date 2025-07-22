/**
 * Emoji mapping utilities for devlog core fields
 *
 * Provides visual emoji representations for devlog status, priority, and type values.
 * Supports multiple emoji styles for different contexts and user preferences.
 */

import { DevlogPriority, DevlogStatus, DevlogType, NoteCategory } from '../../types/index.js';

/**
 * Gets the appropriate emoji for a devlog status
 */
export const getStatusEmoji = (status: DevlogStatus): string => {
  switch (status) {
    case 'new':
      return '🆕';          // New symbol
    case 'in-progress':
      return '🔄';          // Counterclockwise arrows (spinning/progress)
    case 'blocked':
      return '🛑';          // Stop sign
    case 'in-review':
      return '👀';          // Eyes (under review)
    case 'testing':
      return '🧪';          // Test tube (testing)
    case 'done':
      return '✅';          // Check mark
    case 'cancelled':
      return '❌';          // Cross mark
    default:
      return '⏰';          // Clock (waiting/pending)
  }
};

/**
 * Gets the appropriate emoji for a devlog priority
 */
export const getPriorityEmoji = (priority: DevlogPriority): string => {
  switch (priority) {
    case 'critical':
      return '🔥';          // Fire (critical/urgent)
    case 'high':
      return '⚠️';          // Warning sign
    case 'medium':
      return 'ℹ️';          // Information
    case 'low':
      return '⬇️';          // Down arrow (low priority)
    default:
      return '➖';          // Minus sign
  }
};

/**
 * Gets the appropriate emoji for a devlog type
 */
export const getTypeEmoji = (type: DevlogType): string => {
  switch (type) {
    case 'feature':
      return '⭐';          // Star (new feature)
    case 'bugfix':
      return '🐛';          // Bug
    case 'task':
      return '📋';          // Clipboard (task/checklist)
    case 'refactor':
      return '🔧';          // Wrench (tool/refactor)
    case 'docs':
      return '📚';          // Books (documentation)
    default:
      return '📝';          // Memo (general)
  }
};

/**
 * Gets the appropriate emoji for a note category
 */
export const getNoteCategoryEmoji = (category: NoteCategory): string => {
  switch (category) {
    case 'progress':
      return '📈';          // Chart with upwards trend (progress)
    case 'issue':
      return '⚠️';          // Warning sign (problem/issue)
    case 'solution':
      return '✅';          // Check mark (solution/resolution)
    case 'idea':
      return '💡';          // Light bulb (idea/suggestion)
    case 'reminder':
      return '📌';          // Pushpin (reminder/important)
    case 'feedback':
      return '💬';          // Speech balloon (feedback/comment)
    default:
      return '📄';          // Page facing up (general note)
  }
};

/**
 * Alternative emoji sets for different contexts or preferences
 */

// More colorful/playful emoji set for status
export const getStatusEmojiAlt = (status: DevlogStatus): string => {
  switch (status) {
    case 'new':
      return '✨';          // Sparkles (new/fresh)
    case 'in-progress':
      return '⚡';          // Lightning (active/energetic)
    case 'blocked':
      return '🚫';          // Prohibited sign
    case 'in-review':
      return '🔍';          // Magnifying glass
    case 'testing':
      return '🔬';          // Microscope
    case 'done':
      return '🎉';          // Party popper (celebration)
    case 'cancelled':
      return '🗑️';          // Trash can
    default:
      return '💭';          // Thought bubble
  }
};

// Professional/minimal emoji set
export const getStatusEmojiMinimal = (status: DevlogStatus): string => {
  switch (status) {
    case 'new':
      return '○';           // White circle
    case 'in-progress':
      return '◐';           // Half-filled circle
    case 'blocked':
      return '●';           // Black circle
    case 'in-review':
      return '◑';           // Different half-filled
    case 'testing':
      return '◒';           // Different pattern
    case 'done':
      return '●';           // Filled circle
    case 'cancelled':
      return '○';           // Empty circle
    default:
      return '◯';           // Large circle
  }
};

/**
 * Emoji style options for different use cases
 */
export type EmojiStyle = 'default' | 'alt' | 'minimal';

/**
 * Utility function to get status emoji by style
 */
export const getStatusEmojiByStyle = (
  status: DevlogStatus,
  style: EmojiStyle = 'default'
): string => {
  switch (style) {
    case 'alt':
      return getStatusEmojiAlt(status);
    case 'minimal':
      return getStatusEmojiMinimal(status);
    default:
      return getStatusEmoji(status);
  }
};

/**
 * Get formatted display string with emoji prefix
 */
export const getStatusDisplayWithEmoji = (
  status: DevlogStatus,
  style: EmojiStyle = 'default'
): string => {
  const emoji = getStatusEmojiByStyle(status, style);
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  return `${emoji} ${statusText}`;
};

export const getPriorityDisplayWithEmoji = (priority: DevlogPriority): string => {
  const emoji = getPriorityEmoji(priority);
  const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);
  return `${emoji} ${priorityText}`;
};

export const getTypeDisplayWithEmoji = (type: DevlogType): string => {
  const emoji = getTypeEmoji(type);
  const typeText = type.charAt(0).toUpperCase() + type.slice(1);
  return `${emoji} ${typeText}`;
};

export const getNoteCategoryDisplayWithEmoji = (category: NoteCategory): string => {
  const emoji = getNoteCategoryEmoji(category);
  const categoryText = category.charAt(0).toUpperCase() + category.slice(1);
  return `${emoji} ${categoryText}`;
};

/**
 * Get all available emoji mappings for reference/documentation
 */
export const getAllEmojiMappings = () => {
  const statuses: DevlogStatus[] = ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'];
  const priorities: DevlogPriority[] = ['low', 'medium', 'high', 'critical'];
  const types: DevlogType[] = ['feature', 'bugfix', 'task', 'refactor', 'docs'];
  const noteCategories: NoteCategory[] = ['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback'];

  return {
    status: {
      default: Object.fromEntries(statuses.map(s => [s, getStatusEmoji(s)])),
      alt: Object.fromEntries(statuses.map(s => [s, getStatusEmojiAlt(s)])),
      minimal: Object.fromEntries(statuses.map(s => [s, getStatusEmojiMinimal(s)])),
    },
    priority: Object.fromEntries(priorities.map(p => [p, getPriorityEmoji(p)])),
    type: Object.fromEntries(types.map(t => [t, getTypeEmoji(t)])),
    noteCategory: Object.fromEntries(noteCategories.map(n => [n, getNoteCategoryEmoji(n)])),
  };
};

/**
 * Create emoji mapping for GitHub issue titles
 */
export const formatGitHubIssueTitle = (
  title: string,
  type: DevlogType,
  status: DevlogStatus,
  priority: DevlogPriority,
  options: {
    includeType?: boolean;
    includeStatus?: boolean;
    includePriority?: boolean;
    statusStyle?: EmojiStyle;
  } = {}
): string => {
  const {
    includeType = true,
    includeStatus = true,
    includePriority = false,
    statusStyle = 'default'
  } = options;

  let prefix = '';

  if (includeStatus) {
    prefix += getStatusEmojiByStyle(status, statusStyle);
  }

  if (includeType) {
    prefix += (prefix ? ' ' : '') + getTypeEmoji(type);
  }

  if (includePriority && priority !== 'medium') {
    prefix += (prefix ? ' ' : '') + getPriorityEmoji(priority);
  }

  return prefix ? `${prefix} ${title}` : title;
};

/**
 * Enhanced format specifically for GitHub issue titles with common patterns
 */
export const formatEnhancedGitHubTitle = (
  title: string,
  type: DevlogType,
  status: DevlogStatus,
  priority: DevlogPriority
): string => {
  // Use status emoji only for active work or high priority
  const shouldShowStatus = status !== 'new' || priority === 'critical' || priority === 'high';

  return formatGitHubIssueTitle(title, type, status, priority, {
    includeType: true,
    includeStatus: shouldShowStatus,
    includePriority: priority === 'critical',
    statusStyle: 'default'
  });
};

/**
 * Format GitHub issue comment with emoji prefix for note category
 */
export const formatGitHubComment = (
  content: string,
  category: NoteCategory,
  options: {
    includeEmoji?: boolean;
    includeTimestamp?: boolean;
    timestamp?: string;
  } = {}
): string => {
  const {
    includeEmoji = true,
    includeTimestamp = false,
    timestamp
  } = options;

  let formattedContent = content;

  if (includeEmoji) {
    const emoji = getNoteCategoryEmoji(category);
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    formattedContent = `${emoji} **${categoryLabel}**\n\n${content}`;
  }

  if (includeTimestamp && timestamp) {
    const date = new Date(timestamp).toLocaleString();
    formattedContent += `\n\n*Posted: ${date}*`;
  }

  return formattedContent;
};
