/**
 * Prisma-based Chat Service
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages chat sessions, messages, and devlog linking using Prisma Client
 * 
 * Features:
 * - Chat session management
 * - Message storage and retrieval
 * - Chat-devlog linking
 * - Search and filtering
 */

import type {
  ChatSession,
  ChatMessage,
  ChatSessionId,
  ChatMessageId,
  DevlogId,
  ChatStatus,
  AgentType,
} from '../../types/index.js';
import { PrismaServiceBase } from '../../services/prisma-service-base.js';

interface ChatServiceInstance {
  service: PrismaChatService;
  createdAt: number;
}

export class PrismaChatService extends PrismaServiceBase {
  private static instances: Map<string, ChatServiceInstance> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get or create a ChatService instance
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(): PrismaChatService {
    const key = 'default';
    
    return this.getOrCreateInstance(this.instances, key, () => new PrismaChatService());
  }

  /**
   * Hook called when Prisma client is successfully connected
   */
  protected async onPrismaConnected(): Promise<void> {
    console.log('[PrismaChatService] Chat service initialized');
  }

  /**
   * Hook called when service is running in fallback mode
   */
  protected async onFallbackMode(): Promise<void> {
    console.log('[PrismaChatService] Chat service initialized in fallback mode');
  }

  /**
   * Hook called during disposal for cleanup
   */
  protected async onDispose(): Promise<void> {
    // Remove from instances map
    for (const [key, instance] of PrismaChatService.instances.entries()) {
      if (instance.service === this) {
        PrismaChatService.instances.delete(key);
        break;
      }
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(session: Omit<ChatSession, 'id'> & { id?: string }): Promise<ChatSession> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] createSession() called in fallback mode - returning mock session');
      return {
        ...session,
        id: session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    try {
      const created = await this.prismaClient!.chatSession.create({
        data: {
          id: session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          agent: session.agent,
          timestamp: session.timestamp,
          workspace: session.workspace,
          workspacePath: session.workspacePath,
          title: session.title,
          status: session.status,
          messageCount: session.messageCount,
          duration: session.duration,
          metadata: session.metadata ? JSON.stringify(session.metadata) : '{}',
          updatedAt: session.updatedAt,
          archived: session.archived,
        },
      });

      return this.mapPrismaToSession(created);
    } catch (error) {
      console.error('[PrismaChatService] Failed to create session:', error);
      throw new Error(`Failed to create chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a chat session by ID
   */
  async getSession(sessionId: ChatSessionId): Promise<ChatSession | null> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] getSession() called in fallback mode - returning null');
      return null;
    }

    try {
      const session = await this.prismaClient!.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { sequence: 'asc' },
          },
          devlogLinks: {
            include: {
              devlogEntry: true,
            },
          },
        },
      });

      return session ? this.mapPrismaToSession(session) : null;
    } catch (error) {
      console.error('[PrismaChatService] Failed to get session:', error);
      throw new Error(`Failed to get chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List chat sessions with filtering and pagination
   */
  async listSessions(options?: {
    agent?: AgentType;
    status?: ChatStatus;
    workspace?: string;
    archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] listSessions() called in fallback mode - returning empty result');
      return {
        sessions: [],
        total: 0,
      };
    }

    try {
      const where: any = {};
      
      if (options?.agent) where.agent = options.agent;
      if (options?.status) where.status = options.status;
      if (options?.workspace) where.workspace = { contains: options.workspace };
      if (options?.archived !== undefined) where.archived = options.archived;

      const [sessions, total] = await Promise.all([
        this.prismaClient!.chatSession.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
          include: {
            messages: {
              orderBy: { sequence: 'asc' },
              take: 5, // Include first few messages for preview
            },
          },
        }),
        this.prismaClient!.chatSession.count({ where }),
      ]);

      return {
        sessions: sessions.map(session => this.mapPrismaToSession(session)),
        total,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to list sessions:', error);
      throw new Error(`Failed to list chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a chat session
   */
  async updateSession(sessionId: ChatSessionId, updates: Partial<ChatSession>): Promise<ChatSession> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] updateSession() called in fallback mode - returning mock session');
      const existing = await this.getSession(sessionId);
      if (!existing) {
        throw new Error('Chat session not found');
      }
      
      return {
        ...existing,
        ...updates,
      };
    }

    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.messageCount !== undefined) updateData.messageCount = updates.messageCount;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
      if (updates.updatedAt !== undefined) updateData.updatedAt = updates.updatedAt;
      if (updates.archived !== undefined) updateData.archived = updates.archived;

      const updated = await this.prismaClient!.chatSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          messages: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      return this.mapPrismaToSession(updated);
    } catch (error) {
      console.error('[PrismaChatService] Failed to update session:', error);
      throw new Error(`Failed to update chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: ChatSessionId): Promise<void> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] deleteSession() called in fallback mode - operation ignored');
      return;
    }

    try {
      await this.prismaClient!.chatSession.delete({
        where: { id: sessionId },
      });
    } catch (error) {
      console.error('[PrismaChatService] Failed to delete session:', error);
      throw new Error(`Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(sessionId: ChatSessionId, message: Omit<ChatMessage, 'id' | 'sessionId'>): Promise<ChatMessage> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] addMessage() called in fallback mode - returning mock message');
      return {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
      };
    }

    try {
      const created = await this.prismaClient!.chatMessage.create({
        data: {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          sequence: message.sequence,
          metadata: message.metadata ? JSON.stringify(message.metadata) : '{}',
          searchContent: message.searchContent,
        },
      });

      // Update session message count
      await this.prismaClient!.chatSession.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          updatedAt: new Date().toISOString(),
        },
      });

      return this.mapPrismaToMessage(created);
    } catch (error) {
      console.error('[PrismaChatService] Failed to add message:', error);
      throw new Error(`Failed to add chat message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get messages for a chat session
   */
  async getMessages(sessionId: ChatSessionId, options?: {
    limit?: number;
    offset?: number;
  }): Promise<ChatMessage[]> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] getMessages() called in fallback mode - returning empty array');
      return [];
    }

    try {
      const messages = await this.prismaClient!.chatMessage.findMany({
        where: { sessionId },
        orderBy: { sequence: 'asc' },
        take: options?.limit,
        skip: options?.offset,
      });

      return messages.map(message => this.mapPrismaToMessage(message));
    } catch (error) {
      console.error('[PrismaChatService] Failed to get messages:', error);
      throw new Error(`Failed to get chat messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search chat sessions and messages
   */
  async search(query: string, options?: {
    agent?: AgentType;
    workspace?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] search() called in fallback mode - returning empty result');
      return {
        sessions: [],
        total: 0,
      };
    }

    try {
      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { workspace: { contains: query, mode: 'insensitive' } },
          { 
            messages: {
              some: {
                OR: [
                  { content: { contains: query, mode: 'insensitive' } },
                  { searchContent: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      };

      if (options?.agent) where.agent = options.agent;
      if (options?.workspace) {
        where.AND = [
          ...(where.AND || []),
          { workspace: { contains: options.workspace } },
        ];
      }

      const [sessions, total] = await Promise.all([
        this.prismaClient!.chatSession.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
          include: {
            messages: {
              orderBy: { sequence: 'asc' },
              take: 3, // Include first few messages for context
            },
          },
        }),
        this.prismaClient!.chatSession.count({ where }),
      ]);

      return {
        sessions: sessions.map(session => this.mapPrismaToSession(session)),
        total,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to search:', error);
      throw new Error(`Failed to search chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import chat sessions from external sources
   */
  async importSessions(sessions: Array<Omit<ChatSession, 'id'> & { id?: string }>): Promise<ChatSession[]> {
    await this.ensureInitialized();

    try {
      const imported: ChatSession[] = [];
      
      for (const session of sessions) {
        const created = await this.createSession(session);
        imported.push(created);
      }
      
      return imported;
    } catch (error) {
      console.error('[PrismaChatService] Failed to import sessions:', error);
      throw new Error(`Failed to import chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Link a chat session to a devlog entry
   */
  async linkToDevlog(sessionId: ChatSessionId, devlogId: DevlogId, linkReason?: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] linkToDevlog() called in fallback mode - operation ignored');
      return;
    }

    try {
      await this.prismaClient!.chatDevlogLink.create({
        data: {
          id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          devlogId: Number(devlogId),
          timestamp: new Date(),
          linkReason: linkReason || 'Manual link',
        },
      });

      // Update session status
      await this.prismaClient!.chatSession.update({
        where: { id: sessionId },
        data: { status: 'linked' },
      });
    } catch (error) {
      console.error('[PrismaChatService] Failed to link to devlog:', error);
      throw new Error(`Failed to link chat to devlog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get devlog entries linked to a chat session
   */
  async getLinkedDevlogs(sessionId: ChatSessionId): Promise<Array<{ devlogId: DevlogId; linkReason: string; timestamp: Date }>> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaChatService] getLinkedDevlogs() called in fallback mode - returning empty array');
      return [];
    }

    try {
      const links = await this.prismaClient!.chatDevlogLink.findMany({
        where: { sessionId },
        include: { devlogEntry: true },
        orderBy: { timestamp: 'desc' },
      });

      return links.map(link => ({
        devlogId: link.devlogId,
        linkReason: link.linkReason,
        timestamp: link.timestamp,
      }));
    } catch (error) {
      console.error('[PrismaChatService] Failed to get linked devlogs:', error);
      throw new Error(`Failed to get linked devlogs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map Prisma entities to domain types
   */
  private mapPrismaToSession(prismaSession: any): ChatSession {
    return {
      id: prismaSession.id,
      agent: prismaSession.agent,
      timestamp: prismaSession.timestamp,
      workspace: prismaSession.workspace,
      workspacePath: prismaSession.workspacePath,
      title: prismaSession.title,
      status: prismaSession.status,
      messageCount: prismaSession.messageCount,
      duration: prismaSession.duration,
      metadata: prismaSession.metadata ? JSON.parse(prismaSession.metadata) : {},
      tags: [], // TODO: Extract from metadata if needed
      importedAt: prismaSession.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: prismaSession.updatedAt,
      linkedDevlogs: prismaSession.devlogLinks?.map((link: any) => link.devlogId) || [],
      archived: prismaSession.archived,
    };
  }

  private mapPrismaToMessage(prismaMessage: any): ChatMessage {
    return {
      id: prismaMessage.id,
      sessionId: prismaMessage.sessionId,
      role: prismaMessage.role,
      content: prismaMessage.content,
      timestamp: prismaMessage.timestamp,
      sequence: prismaMessage.sequence,
      metadata: prismaMessage.metadata ? JSON.parse(prismaMessage.metadata) : {},
      searchContent: prismaMessage.searchContent,
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    await super.dispose();
  }
}