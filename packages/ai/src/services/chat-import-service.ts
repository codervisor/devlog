/**
 * Chat Import Service
 *
 * Service for importing chat history from AI assistants and converting
 * them to the devlog system format.
 */

import type {
  ChatSession as CoreChatSession,
  ChatMessage as CoreChatMessage,
  ChatImportProgress,
  ChatSource,
  AgentType,
} from '@codervisor/devlog-core';

import { CopilotParser } from '../parsers/copilot/copilot-parser.js';
import type { WorkspaceData, ChatSession, Message } from '../models/index.js';

export interface ChatImportService {
  /**
   * Import chat history from GitHub Copilot
   */
  importFromCopilot(): Promise<ChatImportProgress>;

  /**
   * Import chat history from a specific source
   */
  importFromSource(
    source: ChatSource,
    config?: Record<string, unknown>,
  ): Promise<ChatImportProgress>;

  /**
   * Convert AI package chat data to core package format
   */
  convertToCoreChatSessions(workspaceData: WorkspaceData): CoreChatSession[];

  /**
   * Convert AI package messages to core package format
   */
  convertToCoreMessages(sessions: ChatSession[]): CoreChatMessage[];
}

export class DefaultChatImportService implements ChatImportService {
  async importFromCopilot(): Promise<ChatImportProgress> {
    const importId = this.generateImportId();
    const progress: ChatImportProgress = {
      importId,
      status: 'running',
      source: 'github-copilot',
      progress: {
        totalSessions: 0,
        processedSessions: 0,
        totalMessages: 0,
        processedMessages: 0,
        percentage: 0,
      },
      startedAt: new Date().toISOString(),
    };

    try {
      // Use CopilotParser to discover chat data
      const parser = new CopilotParser();
      const workspaceData = await parser.discoverChatData();

      progress.progress.totalSessions = workspaceData.chat_sessions.length;

      // Convert to core format
      const coreSessions = this.convertToCoreChatSessions(workspaceData);
      const coreMessages = this.convertToCoreMessages(workspaceData.chat_sessions);

      progress.progress.totalMessages = coreMessages.length;

      // Save to storage
      for (const session of coreSessions) {
        // await this.storageProvider.saveChatSession(session);
        progress.progress.processedSessions++;
      }

      if (coreMessages.length > 0) {
        // await this.storageProvider.saveChatMessages(coreMessages);
        progress.progress.processedMessages = coreMessages.length;
      }

      progress.progress.percentage = 100;
      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.results = {
        importedSessions: coreSessions.length,
        importedMessages: coreMessages.length,
        linkedSessions: 0,
        errors: 0,
        warnings: [],
      };

      return progress;
    } catch (error: unknown) {
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { stack: error instanceof Error ? error.stack : undefined },
      };
      throw error;
    }
  }

  async importFromSource(
    source: ChatSource,
    config?: Record<string, unknown>,
  ): Promise<ChatImportProgress> {
    switch (source) {
      case 'github-copilot':
        return this.importFromCopilot();
      default:
        throw new Error(`Unsupported chat source: ${source}`);
    }
  }

  convertToCoreChatSessions(workspaceData: WorkspaceData): CoreChatSession[] {
    return workspaceData.chat_sessions.map((session, index) => ({
      id: session.session_id || `imported_${Date.now()}_${index}`,
      agent: session.agent as AgentType,
      timestamp: session.timestamp.toISOString(),
      workspace: session.workspace,
      workspacePath: session.workspace,
      title: `Chat Session ${session.session_id?.slice(0, 8) || index}`,
      status: 'imported' as const,
      messageCount: session.messages.length,
      duration: undefined,
      metadata: session.metadata,
      tags: [],
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedDevlogs: [],
      archived: false,
    }));
  }

  convertToCoreMessages(sessions: ChatSession[]): CoreChatMessage[] {
    const messages: CoreChatMessage[] = [];

    for (const session of sessions) {
      session.messages.forEach((message, index) => {
        messages.push({
          id: message.id || `msg_${Date.now()}_${index}`,
          sessionId: session.session_id || `session_${Date.now()}`,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          sequence: index,
          metadata: message.metadata,
          searchContent: message.content.toLowerCase().replace(/[^\w\s]/g, ' '),
        });
      });
    }

    return messages;
  }

  private generateImportId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
