/**
 * Chat import service for importing chat history from various sources
 * 
 * This service handles importing chat data from sources like codehist (GitHub Copilot)
 * into the devlog storage system with proper workspace mapping and linking.
 */

import { CopilotParser } from '@devlog/ai';
import type {
  ChatSession,
  ChatMessage,
  ChatWorkspace,
  ChatImportConfig,
  ChatImportProgress,
  ChatDevlogLink,
  StorageProvider,
  DevlogEntry,
  AgentType,
  ChatStatus,
  ChatSessionId,
} from '../types/index.js';

export interface ChatImportService {
  /**
   * Import chat history from codehist parser
   */
  importFromCodehist(config: ChatImportConfig): Promise<ChatImportProgress>;

  /**
   * Get import progress by ID
   */
  getImportProgress(importId: string): Promise<ChatImportProgress | null>;

  /**
   * Suggest links between chat sessions and devlog entries
   */
  suggestChatDevlogLinks(sessionId?: ChatSessionId, minConfidence?: number): Promise<ChatDevlogLink[]>;

  /**
   * Auto-link chat sessions to devlog entries based on various heuristics
   */
  autoLinkSessions(sessionIds: ChatSessionId[], threshold?: number): Promise<ChatDevlogLink[]>;
}

export class DefaultChatImportService implements ChatImportService {
  private storageProvider: StorageProvider;
  private activeImports = new Map<string, ChatImportProgress>();

  constructor(storageProvider: StorageProvider) {
    this.storageProvider = storageProvider;
  }

  async importFromCodehist(config: ChatImportConfig): Promise<ChatImportProgress> {
    const importId = this.generateImportId();
    const progress: ChatImportProgress = {
      importId,
      status: 'pending',
      source: 'codehist',
      progress: {
        totalSessions: 0,
        processedSessions: 0,
        totalMessages: 0,
        processedMessages: 0,
        percentage: 0
      },
      startedAt: new Date().toISOString()
    };

    this.activeImports.set(importId, progress);

    // Start import in background if requested
    if (config.sourceConfig.background !== false) {
      this.runImportInBackground(importId, config);
    } else {
      await this.runImport(importId, config);
    }

    return progress;
  }

  async getImportProgress(importId: string): Promise<ChatImportProgress | null> {
    return this.activeImports.get(importId) || null;
  }

  async suggestChatDevlogLinks(sessionId?: ChatSessionId, minConfidence = 0.5): Promise<ChatDevlogLink[]> {
    const suggestions: ChatDevlogLink[] = [];

    try {
      // Get sessions to analyze
      let sessions: ChatSession[] = [];
      if (sessionId) {
        const session = await this.storageProvider.getChatSession(sessionId);
        if (session) {
          sessions = [session];
        }
      } else {
        // Get recent unlinked sessions
        sessions = await this.storageProvider.listChatSessions({
          includeArchived: false
        }, 0, 50);
      }

      // Get all devlog entries for linking analysis (without pagination)
      const devlogResult = await this.storageProvider.list();
      const devlogEntries = Array.isArray(devlogResult) ? devlogResult : devlogResult.items;

      // Analyze each session for potential links
      for (const session of sessions) {
        const sessionSuggestions = await this.analyzeChatSessionForLinks(session, devlogEntries, minConfidence);
        suggestions.push(...sessionSuggestions);
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);
    } catch (error: any) {
      console.error('[ChatImportService] Error suggesting chat-devlog links:', error);
      throw error;
    }
  }

  async autoLinkSessions(sessionIds: ChatSessionId[], threshold = 0.8): Promise<ChatDevlogLink[]> {
    const confirmedLinks: ChatDevlogLink[] = [];

    try {
      for (const sessionId of sessionIds) {
        const suggestions = await this.suggestChatDevlogLinks(sessionId, threshold);
        
        // Auto-confirm high-confidence suggestions
        for (const suggestion of suggestions) {
          if (suggestion.confidence >= threshold) {
            suggestion.confirmed = true;
            await this.storageProvider.saveChatDevlogLink(suggestion);
            confirmedLinks.push(suggestion);
          }
        }
      }

      return confirmedLinks;
    } catch (error: any) {
      console.error('[ChatImportService] Error auto-linking sessions:', error);
      throw error;
    }
  }

  // Private implementation methods

  private async runImportInBackground(importId: string, config: ChatImportConfig): Promise<void> {
    try {
      await this.runImport(importId, config);
    } catch (error: any) {
      console.error('[ChatImportService] Background import failed:', error);
      const progress = this.activeImports.get(importId);
      if (progress) {
        progress.status = 'failed';
        progress.completedAt = new Date().toISOString();
        progress.error = {
          message: error.message,
          details: { stack: error.stack }
        };
      }
    }
  }

  private async runImport(importId: string, config: ChatImportConfig): Promise<void> {
    const progress = this.activeImports.get(importId)!;
    progress.status = 'running';

    try {
      console.log(`[ChatImportService] Starting import ${importId} from ${config.source}`);

      // Initialize codehist parser
      const parser = new CopilotParser();
      const workspaceData = await parser.discoverVSCodeCopilotData();

      // Update progress with discovered data
      progress.progress.totalSessions = workspaceData.chat_sessions.length;
      progress.progress.totalMessages = workspaceData.chat_sessions.reduce(
        (sum: number, session: any) => sum + session.messages.length, 0
      );

      console.log(`[ChatImportService] Discovered ${progress.progress.totalSessions} sessions with ${progress.progress.totalMessages} messages`);

      // Process workspaces first
      await this.processWorkspaces(workspaceData, config);

      // Process chat sessions
      let importedSessions = 0;
      let importedMessages = 0;
      let linkedSessions = 0;

      for (const sessionData of workspaceData.chat_sessions) {
        try {
          // Convert to devlog chat session format
          const chatSession = await this.convertToDevlogChatSession(sessionData, config);
          
          // Save session
          await this.storageProvider.saveChatSession(chatSession);
          importedSessions++;

          // Convert and save messages
          const chatMessages = await this.convertToDevlogChatMessages(sessionData, chatSession.id);
          if (chatMessages.length > 0) {
            await this.storageProvider.saveChatMessages(chatMessages);
            importedMessages += chatMessages.length;
          }

          // Auto-link if enabled
          if (config.autoLink) {
            const links = await this.autoLinkSessions([chatSession.id], config.autoLinkThreshold);
            if (links.length > 0) {
              linkedSessions++;
            }
          }

          // Update progress
          progress.progress.processedSessions++;
          progress.progress.processedMessages += sessionData.messages.length;
          progress.progress.percentage = Math.round(
            (progress.progress.processedSessions / progress.progress.totalSessions) * 100
          );

          console.log(`[ChatImportService] Processed session ${progress.progress.processedSessions}/${progress.progress.totalSessions}`);

        } catch (sessionError: any) {
          console.error(`[ChatImportService] Error processing session:`, sessionError);
          progress.results = progress.results || {
            importedSessions: 0,
            importedMessages: 0,
            linkedSessions: 0,
            errors: 0,
            warnings: []
          };
          progress.results.errors++;
        }
      }

      // Finalize import
      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.results = {
        importedSessions,
        importedMessages,
        linkedSessions,
        errors: 0,
        warnings: []
      };

      console.log(`[ChatImportService] Import ${importId} completed successfully:`, progress.results);

    } catch (error: any) {
      console.error(`[ChatImportService] Import ${importId} failed:`, error);
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.error = {
        message: error.message,
        details: { stack: error.stack }
      };
    }
  }

  private async processWorkspaces(workspaceData: any, config: ChatImportConfig): Promise<void> {
    // Extract unique workspaces from sessions
    const workspaceMap = new Map<string, any>();

    for (const session of workspaceData.chat_sessions) {
      if (session.workspace) {
        const workspaceId = this.normalizeWorkspaceId(session.workspace);
        if (!workspaceMap.has(workspaceId)) {
          workspaceMap.set(workspaceId, {
            id: workspaceId,
            name: this.extractWorkspaceName(session.workspace),
            path: session.workspace,
            source: 'VS Code',
            firstSeen: session.timestamp.toISOString(),
            lastSeen: session.timestamp.toISOString(),
            sessionCount: 0,
            metadata: {}
          });
        }

        const workspace = workspaceMap.get(workspaceId)!;
        workspace.sessionCount++;
        
        // Update date range
        if (session.timestamp.toISOString() < workspace.firstSeen) {
          workspace.firstSeen = session.timestamp.toISOString();
        }
        if (session.timestamp.toISOString() > workspace.lastSeen) {
          workspace.lastSeen = session.timestamp.toISOString();
        }
      }
    }

    // Save workspaces
    for (const workspace of workspaceMap.values()) {
      await this.storageProvider.saveChatWorkspace(workspace);
    }

    console.log(`[ChatImportService] Processed ${workspaceMap.size} workspaces`);
  }

  private async convertToDevlogChatSession(sessionData: any, config: ChatImportConfig): Promise<ChatSession> {
    const now = new Date().toISOString();
    
    return {
      id: sessionData.session_id || this.generateSessionId(),
      agent: 'GitHub Copilot' as AgentType,
      timestamp: sessionData.timestamp.toISOString(),
      workspace: sessionData.workspace ? this.normalizeWorkspaceId(sessionData.workspace) : undefined,
      workspacePath: sessionData.workspace,
      title: this.generateSessionTitle(sessionData),
      status: 'imported' as ChatStatus,
      messageCount: sessionData.messages.length,
      duration: this.calculateSessionDuration(sessionData),
      metadata: sessionData.metadata || {},
      tags: [],
      importedAt: now,
      updatedAt: now,
      linkedDevlogs: [],
      archived: false
    };
  }

  private async convertToDevlogChatMessages(sessionData: any, sessionId: ChatSessionId): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    for (let i = 0; i < sessionData.messages.length; i++) {
      const messageData = sessionData.messages[i];
      
      messages.push({
        id: messageData.id || `${sessionId}_${i}`,
        sessionId,
        role: messageData.role,
        content: messageData.content,
        timestamp: messageData.timestamp.toISOString(),
        sequence: i,
        metadata: messageData.metadata || {},
        searchContent: this.optimizeForSearch(messageData.content)
      });
    }

    return messages;
  }

  private async analyzeChatSessionForLinks(
    session: ChatSession, 
    devlogEntries: DevlogEntry[], 
    minConfidence: number
  ): Promise<ChatDevlogLink[]> {
    const suggestions: ChatDevlogLink[] = [];

    for (const devlog of devlogEntries) {
      const link = await this.analyzeSessionDevlogPair(session, devlog);
      if (link && link.confidence >= minConfidence) {
        suggestions.push(link);
      }
    }

    return suggestions;
  }

  private async analyzeSessionDevlogPair(session: ChatSession, devlog: DevlogEntry): Promise<ChatDevlogLink | null> {
    // Temporal analysis
    const temporalScore = this.calculateTemporalScore(session, devlog);
    
    // Content analysis (requires messages)
    const messages = await this.storageProvider.getChatMessages(session.id);
    const contentScore = this.calculateContentScore(messages, devlog);
    
    // Workspace analysis
    const workspaceScore = this.calculateWorkspaceScore(session, devlog);

    // Combined confidence
    const confidence = (temporalScore * 0.3) + (contentScore * 0.5) + (workspaceScore * 0.2);

    if (confidence < 0.1) {
      return null;
    }

    return {
      sessionId: session.id,
      devlogId: devlog.id!,
      confidence,
      reason: contentScore > 0.5 ? 'content' : temporalScore > 0.5 ? 'temporal' : 'workspace',
      evidence: {
        timeOverlap: this.calculateTimeOverlap(session, devlog),
        contentMatches: [], // TODO: Implement content matching
        workspaceMatch: {
          chatWorkspace: session.workspace || '',
          devlogWorkspace: 'default', // TODO: Get from devlog workspace context
          similarity: workspaceScore
        }
      },
      confirmed: false,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    };
  }

  // Helper methods

  private generateImportId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private normalizeWorkspaceId(workspace: string): string {
    // Extract a clean workspace identifier from path
    const parts = workspace.split('/');
    return parts[parts.length - 1] || workspace;
  }

  private extractWorkspaceName(workspace: string): string {
    return this.normalizeWorkspaceId(workspace);
  }

  private generateSessionTitle(sessionData: any): string {
    if (sessionData.messages.length === 0) {
      return 'Empty chat session';
    }

    const firstMessage = sessionData.messages[0];
    if (firstMessage.role === 'user') {
      // Use first 60 characters of first user message
      return firstMessage.content.substring(0, 60).trim() + (firstMessage.content.length > 60 ? '...' : '');
    }

    return `Chat session with ${sessionData.messages.length} messages`;
  }

  private calculateSessionDuration(sessionData: any): number | undefined {
    if (sessionData.messages.length < 2) {
      return undefined;
    }

    const firstMessage = sessionData.messages[0];
    const lastMessage = sessionData.messages[sessionData.messages.length - 1];
    
    return new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime();
  }

  private optimizeForSearch(content: string): string {
    // Remove code blocks and clean up content for better search
    return content
      .replace(/```[\s\S]*?```/g, ' [code] ')
      .replace(/`[^`]+`/g, ' [code] ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateTemporalScore(session: ChatSession, devlog: DevlogEntry): number {
    const sessionTime = new Date(session.timestamp).getTime();
    const devlogCreated = new Date(devlog.createdAt).getTime();
    const devlogUpdated = new Date(devlog.updatedAt).getTime();

    // Check if session overlaps with devlog timeframe
    const timeDiff = Math.min(
      Math.abs(sessionTime - devlogCreated),
      Math.abs(sessionTime - devlogUpdated)
    );

    // Score based on time proximity (closer = higher score)
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) return 1.0;
    if (daysDiff <= 7) return 0.8;
    if (daysDiff <= 30) return 0.5;
    if (daysDiff <= 90) return 0.2;
    return 0.0;
  }

  private calculateContentScore(messages: ChatMessage[], devlog: DevlogEntry): number {
    // Simple keyword matching for now
    const devlogText = `${devlog.title} ${devlog.description}`.toLowerCase();
    const chatText = messages.map(m => m.content).join(' ').toLowerCase();

    const keywords = devlogText.split(/\s+/).filter(word => word.length > 3);
    let matches = 0;

    for (const keyword of keywords.slice(0, 10)) { // Limit to first 10 keywords
      if (chatText.includes(keyword)) {
        matches++;
      }
    }

    return Math.min(matches / Math.max(keywords.length, 1), 1.0);
  }

  private calculateWorkspaceScore(session: ChatSession, devlog: DevlogEntry): number {
    // Simple workspace matching - can be enhanced with more sophisticated logic
    if (!session.workspace) {
      return 0.1; // Default low score for unknown workspace
    }

    // For now, assume workspaces match if they exist
    // TODO: Implement proper workspace mapping from devlog configuration
    return 0.5;
  }

  private calculateTimeOverlap(session: ChatSession, devlog: DevlogEntry): any {
    const sessionTime = new Date(session.timestamp);
    const devlogCreated = new Date(devlog.createdAt);
    const devlogUpdated = new Date(devlog.updatedAt);

    return {
      chatStart: session.timestamp,
      chatEnd: session.timestamp, // Single point in time for now
      devlogStart: devlog.createdAt,
      devlogEnd: devlog.updatedAt,
      overlapHours: 0 // TODO: Calculate actual overlap
    };
  }
}
