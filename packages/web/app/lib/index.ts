/**
 * Main library exports
 * Re-exports from organized submodules for convenient importing
 *
 * Usage:
 * import { apiClient, ApiError } from '@/lib';
 * import { statusOptions, getStatusColor } from '@/lib';
 * import { RouteParamParsers } from '@/lib';
 * import { formatTimeAgo, cn } from '@/lib';
 */

// API utilities
export * from './api';

// Devlog utilities
export * from './devlog';

// Routing utilities
export * from './routing';

// Project URL utilities
export * from './project-urls';

// Realtime utilities
export * from './realtime';

// General utilities
export * from './utils';
