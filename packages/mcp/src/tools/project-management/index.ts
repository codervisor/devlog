/**
 * Project Management Tools
 *
 * Tools for organizing agent sessions by project and tracking work items.
 * This is a SUPPORTING feature for providing context to agent observability.
 */

export { devlogTools as workItemTools } from './work-item-tools.js';
export { projectTools } from './project-tools.js';
export { documentTools } from './document-tools.js';

// Legacy exports for backward compatibility
export { devlogTools } from './work-item-tools.js';
