/**
 * AI Chat History Parsers
 * 
 * This module provides parsers for various AI coding assistants and their chat histories.
 * Currently supports GitHub Copilot, with planned support for Cursor, Claude Code, and others.
 */

// Export base classes
export { AIAssistantParser, Logger, SimpleConsoleLogger } from './base/ai-assistant-parser.js';

// Export provider-specific parsers
export { CopilotParser } from './copilot/copilot-parser.js';

// Re-export types from models for convenience
export type { SearchResult, ChatStatistics } from '../models/index.js';

// For backwards compatibility, re-export CopilotParser as the default export
export { CopilotParser as default } from './copilot/copilot-parser.js';
