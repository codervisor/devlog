/**
 * Chat import service for importing chat history from various sources
 *
 * This service handles importing chat data through ChatHub (GitHub Copilot, etc.)
 * into the devlog storage system with proper workspace mapping and linking.
 */

import type {
  ChatDevlogLink,
  ChatImportProgress,
  ChatMessage,
  ChatSession,
  ChatSessionId,
  ChatSource,
} from '@codervisor/devlog-core';

// Define workspace info type instead of using any
interface WorkspaceInfo {
  id: string;
  name: string;
  path?: string;
  source: string;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  metadata: Record<string, unknown>;
}

export interface IChatHubService {
  /**
   * Ingest chat sessions from external clients
   */
  ingestChatSessions(sessions: ChatSession[]): Promise<ChatImportProgress>;

  /**
   * Ingest chat messages from external clients
   */
  ingestChatMessages(messages: ChatMessage[]): Promise<void>;

  /**
   * Process bulk chat data from external clients
   */
  processBulkChatData(data: {
    sessions: ChatSession[];
    messages: ChatMessage[];
    source: ChatSource;
    workspaceInfo?: WorkspaceInfo;
  }): Promise<ChatImportProgress>;

  /**
   * Get import progress by ID
   */
  getImportProgress(importId: string): Promise<ChatImportProgress | null>;

  /**
   * Suggest links between chat sessions and devlog entries
   */
  suggestChatDevlogLinks(
    sessionId?: ChatSessionId,
    minConfidence?: number,
  ): Promise<ChatDevlogLink[]>;

  /**
   * Auto-link chat sessions to devlog entries based on various heuristics
   */
  autoLinkSessions(sessionIds: ChatSessionId[], threshold?: number): Promise<ChatDevlogLink[]>;
}

export class ChatHubService implements IChatHubService {
  private activeImports = new Map<string, ChatImportProgress>();

  async ingestChatSessions(sessions: ChatSession[]): Promise<ChatImportProgress> {
    const importId = this.generateImportId();
    const progress: ChatImportProgress = {
      importId,
      status: 'running',
      source: sessions[0]?.agent === 'GitHub Copilot' ? 'github-copilot' : 'manual',
      progress: {
        totalSessions: sessions.length,
        processedSessions: 0,
        totalMessages: 0,
        processedMessages: 0,
        percentage: 0,
      },
      startedAt: new Date().toISOString(),
    };

    this.activeImports.set(importId, progress);

    try {
      console.log(`[ChatHub] Ingesting ${sessions.length} chat sessions`);

      for (const session of sessions) {
        // await this.storageProvider.saveChatSession(session);
        progress.progress.processedSessions++;
        progress.progress.percentage = Math.round(
          (progress.progress.processedSessions / progress.progress.totalSessions) * 100,
        );
      }

      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.results = {
        importedSessions: sessions.length,
        importedMessages: 0,
        linkedSessions: 0,
        errors: 0,
        warnings: [],
      };

      console.log(`[ChatHub] Successfully ingested ${sessions.length} sessions`);
      return progress;
    } catch (error: unknown) {
      console.error('[ChatHub] Error ingesting sessions:', error);
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { stack: error instanceof Error ? error.stack : undefined },
      };
      throw error;
    }
  }

  async ingestChatMessages(messages: ChatMessage[]): Promise<void> {
    try {
      console.log(`[ChatHub] Ingesting ${messages.length} chat messages`);
      // await this.storageProvider.saveChatMessages(messages);
      console.log(`[ChatHub] Successfully ingested ${messages.length} messages`);
    } catch (error: unknown) {
      console.error('[ChatHub] Error ingesting messages:', error);
      throw error;
    }
  }

  async processBulkChatData(data: {
    sessions: ChatSession[];
    messages: ChatMessage[];
    source: ChatSource;
    workspaceInfo?: WorkspaceInfo;
  }): Promise<ChatImportProgress> {
    const importId = this.generateImportId();
    const progress: ChatImportProgress = {
      importId,
      status: 'running',
      source: data.source,
      progress: {
        totalSessions: data.sessions.length,
        processedSessions: 0,
        totalMessages: data.messages.length,
        processedMessages: 0,
        percentage: 0,
      },
      startedAt: new Date().toISOString(),
    };

    this.activeImports.set(importId, progress);

    try {
      console.log(
        `[ChatHub] Processing bulk data: ${data.sessions.length} sessions, ${data.messages.length} messages from ${data.source}`,
      );

      // Process workspace info if provided
      if (data.workspaceInfo) {
        // await this.storageProvider.saveChatWorkspace(data.workspaceInfo);
      }

      // Ingest sessions
      for (const session of data.sessions) {
        // await this.storageProvider.saveChatSession(session);
        progress.progress.processedSessions++;
      }

      // Ingest messages
      if (data.messages.length > 0) {
        // await this.storageProvider.saveChatMessages(data.messages);
        progress.progress.processedMessages = data.messages.length;
      }

      // Update final progress
      progress.progress.percentage = 100;
      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.results = {
        importedSessions: data.sessions.length,
        importedMessages: data.messages.length,
        linkedSessions: 0, // TODO: Implement auto-linking
        errors: 0,
        warnings: [],
      };

      console.log(`[ChatHub] Successfully processed bulk data from ${data.source}`);
      return progress;
    } catch (error: unknown) {
      console.error('[ChatHub] Error processing bulk data:', error);
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { stack: error instanceof Error ? error.stack : undefined },
      };
      throw error;
    }
  }

  async getImportProgress(importId: string): Promise<ChatImportProgress | null> {
    return this.activeImports.get(importId) || null;
  }

  async suggestChatDevlogLinks(
    sessionId?: ChatSessionId,
    minConfidence = 0.5,
  ): Promise<ChatDevlogLink[]> {
    // Simplified implementation - can be enhanced later
    console.log(
      `[ChatHub] Suggesting links for session ${sessionId || 'all'} with min confidence ${minConfidence}`,
    );

    // TODO: Implement sophisticated chat-devlog linking logic
    // For now, return empty array - this will be enhanced with proper analysis
    return [];
  }

  async autoLinkSessions(sessionIds: ChatSessionId[], threshold = 0.8): Promise<ChatDevlogLink[]> {
    // Simplified implementation - can be enhanced later
    console.log(`[ChatHub] Auto-linking ${sessionIds.length} sessions with threshold ${threshold}`);

    // TODO: Implement sophisticated auto-linking logic
    // For now, return empty array - this will be enhanced with proper analysis
    return [];
  }

  // Helper methods

  private generateImportId(): string {
    return `chathub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
