/**
 * Prisma-based Chat Service
 *
 * NOTE: This service is currently a stub and needs to be updated to match
 * the new Prisma schema (ChatSession model with new hierarchy).
 *
 * The new schema uses:
 * - ChatSession.id: Int (auto-increment, not UUID)
 * - ChatSession.sessionId: String (UUID from filename)
 * - ChatSession.workspaceId: Int (foreign key to Workspace)
 * - ChatSession.startedAt/endedAt: Instead of timestamp
 * - ChatMessage relation: Instead of nested messages
 *
 * TODO: Refactor this service to match specs/20251031/003-project-hierarchy-redesign
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
   */
  static getInstance(): PrismaChatService {
    const key = 'default';

    return this.getOrCreateInstance(this.instances, key, () => new PrismaChatService());
  }

  protected async onPrismaConnected(): Promise<void> {
    console.log('[PrismaChatService] Chat service initialized (STUB - needs schema update)');
  }

  protected async onFallbackMode(): Promise<void> {
    console.log('[PrismaChatService] Chat service in fallback mode');
  }

  protected async onDispose(): Promise<void> {
    for (const [key, instance] of PrismaChatService.instances.entries()) {
      if (instance.service === this) {
        PrismaChatService.instances.delete(key);
        break;
      }
    }
  }

  // All methods throw errors indicating need for schema update
  async createSession(_session: Omit<ChatSession, 'id'> & { id?: string }): Promise<ChatSession> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async getSession(_sessionId: ChatSessionId): Promise<ChatSession | null> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async getSessionsByWorkspace(_workspaceId: string, _options?: any): Promise<ChatSession[]> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async updateSession(_sessionId: ChatSessionId, _updates: any): Promise<ChatSession> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async deleteSession(_sessionId: ChatSessionId): Promise<void> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async addMessage(
    _sessionId: ChatSessionId,
    _message: Omit<ChatMessage, 'id'>,
  ): Promise<ChatMessage> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async getMessages(_sessionId: ChatSessionId, _options?: any): Promise<ChatMessage[]> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async searchSessions(_query: string, _options?: any): Promise<ChatSession[]> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async linkToDevlog(_sessionId: ChatSessionId, _devlogId: DevlogId): Promise<void> {
    throw new Error('ChatService needs update for new Prisma schema');
  }

  async getDevlogLinks(_sessionId: ChatSessionId): Promise<any[]> {
    throw new Error('ChatService needs update for new Prisma schema');
  }
}
