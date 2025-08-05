/**
 * AI Chat History Parsers
 *
 * This module provides parsers for various AI coding assistants and their chat histories.
 * Currently supports GitHub Copilot, with planned support for Cursor, Claude Code, and others.
 */

// Export base classes
export { BaseParser, Logger, SimpleConsoleLogger } from './base/base-parser';

// Export provider-specific parsers
export { CopilotParser } from './copilot/copilot-parser.js';
