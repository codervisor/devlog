/**
 * Simple Markdown exporter for CodeHist chat data
 *
 * TypeScript implementation without complex configuration.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import type { ChatStatistics, SearchResult } from '../parsers/index.js';

export interface MarkdownExportData {
  statistics?: ChatStatistics;
  chat_data?: {
    chat_sessions: any[];
  };
  search_results?: SearchResult[];
}

export class MarkdownExporter {
  /**
   * Export chat data to Markdown file
   */
  async exportChatData(data: MarkdownExportData, outputPath: string): Promise<void> {
    const sections: string[] = [];

    // Header
    sections.push('# GitHub Copilot Chat History');
    sections.push('');
    sections.push(`**Export Date:** ${new Date().toLocaleString()}`);
    sections.push('');

    // Statistics
    const stats = data.statistics;
    if (stats) {
      sections.push('## Summary');
      sections.push('');
      sections.push(`- **Total Sessions:** ${stats.total_sessions}`);
      sections.push(`- **Total Messages:** ${stats.total_messages}`);

      if (stats.date_range?.earliest) {
        sections.push(
          `- **Date Range:** ${stats.date_range.earliest} to ${stats.date_range.latest}`,
        );
      }

      // Session types
      if (Object.keys(stats.session_types).length > 0) {
        sections.push('');
        sections.push('**Session Types:**');
        for (const [type, count] of Object.entries(stats.session_types)) {
          sections.push(`- ${type}: ${count}`);
        }
      }

      // Message types
      if (Object.keys(stats.message_types).length > 0) {
        sections.push('');
        sections.push('**Message Types:**');
        for (const [type, count] of Object.entries(stats.message_types)) {
          sections.push(`- ${type}: ${count}`);
        }
      }

      sections.push('');
    }

    // Chat data
    const chatData = data.chat_data;
    if (chatData?.chat_sessions) {
      sections.push('## Chat Sessions');
      sections.push('');

      const sessionsToShow = Math.min(10, chatData.chat_sessions.length);
      for (let i = 0; i < sessionsToShow; i++) {
        const session = chatData.chat_sessions[i];

        const sessionId = (session.session_id || 'Unknown').slice(0, 8); // Truncate for readability
        sections.push(`### Session ${i + 1}: ${sessionId}`);
        sections.push('');
        sections.push(`- **Agent:** ${session.agent || 'Unknown'}`);
        sections.push(`- **Timestamp:** ${session.timestamp || 'Unknown'}`);

        if (session.workspace) {
          sections.push(`- **Workspace:** ${session.workspace}`);
        }

        sections.push(`- **Messages:** ${(session.messages || []).length}`);
        sections.push('');

        // Messages (limit to first few)
        const messages = session.messages || [];
        const messagesToShow = Math.min(3, messages.length);

        for (let j = 0; j < messagesToShow; j++) {
          const msg = messages[j];
          const role =
            (msg.role || 'Unknown').charAt(0).toUpperCase() + (msg.role || 'Unknown').slice(1);
          sections.push(`#### Message ${j + 1} (${role})`);
          sections.push('');

          let content = msg.content || '';
          if (content.length > 500) {
            content = content.slice(0, 500) + '... [TRUNCATED]';
          }

          sections.push('```');
          sections.push(content);
          sections.push('```');
          sections.push('');
        }

        if (messages.length > 3) {
          sections.push(`... and ${messages.length - 3} more messages`);
          sections.push('');
        }
      }

      if (chatData.chat_sessions.length > 10) {
        sections.push(`... and ${chatData.chat_sessions.length - 10} more sessions`);
        sections.push('');
      }
    }

    // Search results
    const searchResults = data.search_results;
    if (searchResults && searchResults.length > 0) {
      sections.push('## Search Results');
      sections.push('');

      const resultsToShow = Math.min(20, searchResults.length);
      for (let i = 0; i < resultsToShow; i++) {
        const result = searchResults[i];

        sections.push(`### Match ${i + 1}`);
        sections.push('');
        sections.push(`- **Session:** ${(result.session_id || 'Unknown').slice(0, 8)}`);
        sections.push(`- **Role:** ${result.role || 'Unknown'}`);
        sections.push(`- **Timestamp:** ${result.timestamp || 'Unknown'}`);
        sections.push('');
        sections.push('**Context:**');
        sections.push('');
        sections.push('```');
        sections.push(result.context || '');
        sections.push('```');
        sections.push('');
      }

      if (searchResults.length > 20) {
        sections.push(`... and ${searchResults.length - 20} more matches`);
      }
    }

    const markdownContent = sections.join('\n');

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Write to file
    await writeFile(outputPath, markdownContent, 'utf-8');
  }
}
