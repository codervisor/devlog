/**
 * Tests for Services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultChatImportService } from '../services/chat-import-service.js';
import { ChatHubService } from '../services/chat-hub-service.js';

describe('DefaultChatImportService', () => {
  let service: DefaultChatImportService;

  beforeEach(() => {
    service = new DefaultChatImportService();
    vi.clearAllMocks();
  });

  it('should create service with storage provider', () => {
    expect(service).toBeInstanceOf(DefaultChatImportService);
  });

  it('should throw error for unsupported source', async () => {
    await expect(service.importFromSource('manual' as any)).rejects.toThrow(
      'Unsupported chat source: manual',
    );
  });
});

describe('ChatHubService', () => {
  let service: ChatHubService;

  beforeEach(() => {
    service = new ChatHubService();
    vi.clearAllMocks();
  });

  it('should create service with storage provider', () => {
    expect(service).toBeInstanceOf(ChatHubService);
  });

  it('should ingest empty chat sessions', async () => {
    const progress = await service.ingestChatSessions([]);

    expect(progress.status).toBe('completed');
    expect(progress.progress.totalSessions).toBe(0);
    expect(progress.progress.processedSessions).toBe(0);
    expect(progress.progress.percentage).toBe(0);
  });

  it('should return null for non-existent import progress', async () => {
    const result = await service.getImportProgress('non-existent');
    expect(result).toBeNull();
  });
});
