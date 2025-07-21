/**
 * DevlogManager that uses the storage provider abstraction
 * This provides a flexible architecture supporting multiple storage backends
 */

import * as crypto from 'crypto';
import { getOpenStatuses } from './utils/filter-mapping.js';
import type {
  BatchDeleteRequest,
  BatchNoteRequest,
  BatchOperationResult,
  BatchUpdateRequest,
  CreateDevlogRequest,
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogStats,
  DevlogStatus,
  DiscoverDevlogsRequest,
  DiscoveredDevlogEntry,
  DiscoveryResult,
  PaginatedResult,
  NoteCategory,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
  UpdateDevlogRequest,
} from './types/index.js';
import { StorageProviderFactory } from './storage/storage-provider.js';
import { ConfigurationManager } from './configuration-manager.js';
import { DevlogNotFoundError } from './utils/errors.js';
import { devlogEvents, DevlogEvent } from './events/devlog-events.js';

export class DevlogManager {
  private storageProvider!: StorageProvider;
  private readonly configManager: ConfigurationManager;
  private initialized = false;
  private storageUnsubscribe?: () => void;

  constructor() {
    this.configManager = new ConfigurationManager();
  }

  /**
   * Helper method to emit events to local event system
   * Note: Cross-process events are now handled by storage provider subscriptions
   */
  private async emitEvent(event: DevlogEvent): Promise<void> {
    try {
      // Emit to local event system (in-process handlers)
      await devlogEvents.emit(event);

      // Cross-process communication now happens through storage provider subscriptions
      // Each storage provider handles its own change detection and event emission
    } catch (error) {
      console.error('Error emitting devlog event:', error);
    }
  }

  /**
   * Initialize the storage provider based on configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = await this.configManager.loadConfig();

    this.storageProvider = await StorageProviderFactory.create(config.storage!);
    await this.storageProvider.initialize();

    // Subscribe to storage events for cross-process communication
    if (this.storageProvider.subscribe) {
      this.storageUnsubscribe = await this.storageProvider.subscribe(async (event) => {
        // Forward storage events to local event system
        await devlogEvents.emit(event);
      });
      console.debug('Subscribed to storage provider events');
    }

    // TODO: Initialize integration service if integrations are configured
    // const integrations =
    //   this.integrations || (await this.configManager.detectEnterpriseIntegrations());
    // const syncStrategy =
    //   this.syncStrategy || (await this.configManager.detectSyncStrategy(integrations));
    // this.integrationService = new IntegrationService(
    //   this.storageProvider,
    //   integrations,
    //   syncStrategy,
    // );

    this.initialized = true;
  }

  /**
   * Create a new devlog entry
   */
  async createDevlog(request: CreateDevlogRequest): Promise<DevlogEntry> {
    await this.ensureInitialized();

    // Generate semantic key for reference
    const key = this.generateKey(request.title);

    // Create new entry
    const now = new Date().toISOString();
    const entry: DevlogEntry = {
      key,
      title: request.title,
      type: request.type,
      description: request.description,
      status: 'new',
      priority: request.priority || 'medium',
      createdAt: now,
      updatedAt: now,
      assignee: request.assignee,
      notes: [],
      files: [],
      relatedDevlogs: [],
      context: {
        businessContext: request.businessContext || '',
        technicalContext: request.technicalContext || '',
        dependencies: [],
        decisions: [],
        acceptanceCriteria: request.acceptanceCriteria || [],
        risks: [],
      },
      aiContext: {
        currentSummary: '',
        keyInsights: request.initialInsights || [],
        openQuestions: [],
        relatedPatterns: request.relatedPatterns || [],
        suggestedNextSteps: [],
        lastAIUpdate: now,
        contextVersion: 1,
      },
    };

    // Save with integration sync
    await this.storageProvider.save(entry);

    // Emit creation event
    await this.emitEvent({
      type: 'created',
      timestamp: new Date().toISOString(),
      data: entry,
    });

    return entry;
  }

  /**
   * Get a devlog entry by ID
   */
  async getDevlog(id: DevlogId): Promise<DevlogEntry | null> {
    await this.ensureInitialized();
    return await this.storageProvider.get(id);
  }

  /**
   * Update an existing devlog entry
   */
  async updateDevlog(request: UpdateDevlogRequest): Promise<DevlogEntry> {
    await this.ensureInitialized();

    const existing = await this.storageProvider.get(request.id);
    if (!existing) {
      throw new DevlogNotFoundError(request.id, { operation: 'updateDevlog' });
    }

    const updated: DevlogEntry = {
      ...existing,
      updatedAt: new Date().toISOString(),
    };

    // Update basic fields
    if (request.title !== undefined) updated.title = request.title;
    if (request.type !== undefined) updated.type = request.type;
    if (request.description !== undefined) updated.description = request.description;
    if (request.status !== undefined) {
      const oldStatus = existing.status;
      updated.status = request.status;

      // Set closedAt timestamp when status changes to 'done' or 'cancelled'
      if (
        (request.status === 'done' || request.status === 'cancelled') &&
        oldStatus !== 'done' &&
        oldStatus !== 'cancelled'
      ) {
        updated.closedAt = new Date().toISOString();
      }

      // Also set closedAt if the entry is already closed but missing the timestamp (migration case)
      if ((request.status === 'done' || request.status === 'cancelled') && !existing.closedAt) {
        updated.closedAt = new Date().toISOString();
      }

      // Clear closedAt if status changes from closed back to open
      if (
        (oldStatus === 'done' || oldStatus === 'cancelled') &&
        request.status !== 'done' &&
        request.status !== 'cancelled'
      ) {
        updated.closedAt = undefined;
      }
    }
    if (request.priority !== undefined) updated.priority = request.priority;
    if (request.assignee !== undefined) updated.assignee = request.assignee;
    if (request.files !== undefined) updated.files = request.files;
    if (request.archived !== undefined) updated.archived = request.archived;

    // Update enhanced context fields
    if (request.businessContext !== undefined && updated.context)
      updated.context.businessContext = request.businessContext;
    if (request.technicalContext !== undefined && updated.context)
      updated.context.technicalContext = request.technicalContext;
    if (request.acceptanceCriteria !== undefined && updated.context)
      updated.context.acceptanceCriteria = request.acceptanceCriteria;
    if (request.initialInsights !== undefined && updated.aiContext)
      updated.aiContext.keyInsights = request.initialInsights;
    if (request.relatedPatterns !== undefined && updated.aiContext)
      updated.aiContext.relatedPatterns = request.relatedPatterns;

    // Update AI context fields (embedded from updateAIContext functionality)
    let aiContextUpdated = false;
    if (request.currentSummary !== undefined && updated.aiContext) {
      updated.aiContext.currentSummary = request.currentSummary;
      aiContextUpdated = true;
    }
    if (request.keyInsights !== undefined && updated.aiContext) {
      updated.aiContext.keyInsights = request.keyInsights;
      aiContextUpdated = true;
    }
    if (request.openQuestions !== undefined && updated.aiContext) {
      updated.aiContext.openQuestions = request.openQuestions;
      aiContextUpdated = true;
    }
    if (request.suggestedNextSteps !== undefined && updated.aiContext) {
      updated.aiContext.suggestedNextSteps = request.suggestedNextSteps;
      aiContextUpdated = true;
    }

    // Update AI context metadata if any AI fields were modified
    if (aiContextUpdated && updated.aiContext) {
      updated.aiContext.lastAIUpdate = new Date().toISOString();
      updated.aiContext.contextVersion = (updated.aiContext.contextVersion || 0) + 1;
    }

    await this.storageProvider.save(updated);

    // Emit update event
    await this.emitEvent({
      type: 'updated',
      timestamp: new Date().toISOString(),
      data: updated,
    });

    return updated;
  }

  /**
   * Add a note to a devlog entry
   */
  async addNote(
    id: DevlogId,
    content: string,
    category: DevlogNote['category'] = 'progress',
    options?: {
      files?: string[];
      codeChanges?: string;
    },
  ): Promise<DevlogEntry> {
    await this.ensureInitialized();

    const existing = await this.storageProvider.get(id);
    if (!existing) {
      throw new DevlogNotFoundError(id, { operation: 'addNote' });
    }

    const note: DevlogNote = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category,
      content,
      files: options?.files,
      codeChanges: options?.codeChanges,
    };

    const updated: DevlogEntry = {
      ...existing,
      notes: [...existing.notes, note],
      updatedAt: new Date().toISOString(),
    };

    await this.storageProvider.save(updated);

    // Emit note-added event
    await this.emitEvent({
      type: 'note-added',
      timestamp: new Date().toISOString(),
      data: { devlog: updated, note },
    });

    return updated;
  }

  /**
   * Convenience method to update a devlog and add a progress note in one operation
   */
  async updateWithProgress(
    id: DevlogId,
    updates: UpdateDevlogRequest,
    progressNote: string,
    options?: {
      category?: NoteCategory;
      files?: string[];
      codeChanges?: string;
    },
  ): Promise<DevlogEntry> {
    // First update the devlog
    await this.updateDevlog({ ...updates, id });

    // Then add the progress note
    return await this.addNote(id, progressNote, options?.category || 'progress', {
      files: options?.files,
      codeChanges: options?.codeChanges,
    });
  }

  /**
   * List devlog entries with optional filtering
   * By default, excludes archived entries only (includes done/cancelled entries)
   * Returns paginated results for consistency with storage layer
   */
  async listDevlogs(
    filter?: DevlogFilter,
    options?: { includeAllStatuses?: boolean },
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    // Apply default exclusion of archived entries only
    const enhancedFilter = this.applyDefaultFilters(filter, options);

    return await this.storageProvider.list(enhancedFilter);
  }

  /**
   * Get all devlog entries as an array (internal method for stats and other operations)
   * @private
   */
  private async getAllDevlogsAsArray(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    await this.ensureInitialized();

    // Create filter without pagination to get all entries
    const filterWithoutPagination = filter ? { ...filter, pagination: undefined } : {};
    const enhancedFilter = this.applyDefaultFilters(filterWithoutPagination);

    const result = await this.storageProvider.list(enhancedFilter);

    // Always extract items from paginated result
    return result.items;
  }

  /**
   * Apply default filters including exclusion of archived entries only
   * @private
   */
  private applyDefaultFilters(
    filter?: DevlogFilter,
    options: { includeAllStatuses?: boolean } = {},
  ): DevlogFilter {
    const enhancedFilter = { ...filter };

    // Always exclude archived entries by default unless explicitly requested
    if (enhancedFilter.archived === undefined) {
      enhancedFilter.archived = false;
    }

    // No longer exclude done/cancelled statuses by default - only exclude archived entries
    // This means all statuses (new, in-progress, blocked, in-review, testing, done, cancelled)
    // are included by default, only archived entries are filtered out

    return enhancedFilter;
  }

  /**
   * Search devlog entries
   * By default, excludes archived entries only (includes done/cancelled entries)
   */
  async searchDevlogs(query: string, filter?: DevlogFilter): Promise<DevlogEntry[]> {
    await this.ensureInitialized();
    const results = await this.storageProvider.search(query);

    // Apply default filters to search results (excluding archived entries only)
    const enhancedFilter = this.applyDefaultFilters(filter);

    // Filter results based on the enhanced filter - extract items from paginated result
    return this.filterEntries(results.items, enhancedFilter);
  }

  /**
   * Apply client-side filtering to a list of entries
   * @private
   */
  private filterEntries(entries: DevlogEntry[], filter: DevlogFilter): DevlogEntry[] {
    let filtered = [...entries];

    // Status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter((entry) => filter.status!.includes(entry.status));
    }

    // Type filter
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter((entry) => filter.type!.includes(entry.type));
    }

    // Priority filter
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter((entry) => filter.priority!.includes(entry.priority));
    }

    // Assignee filter
    if (filter.assignee) {
      const assigneeQuery = filter.assignee.toLowerCase().trim();
      filtered = filtered.filter((entry) => entry.assignee?.toLowerCase().includes(assigneeQuery));
    }

    // Date range filter
    if (filter.fromDate) {
      const fromDate = new Date(filter.fromDate);
      filtered = filtered.filter((entry) => new Date(entry.createdAt) >= fromDate);
    }

    if (filter.toDate) {
      const toDate = new Date(filter.toDate);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((entry) => new Date(entry.createdAt) <= toDate);
    }

    return filtered;
  }

  /**
   * Get devlog statistics
   * Includes all statuses (including cancelled) but excludes archived entries by default
   */
  async getStats(): Promise<DevlogStats> {
    await this.ensureInitialized();

    // For stats, include all statuses but exclude archived entries
    const enhancedFilter = this.applyDefaultFilters({}, { includeAllStatuses: true });

    return await this.storageProvider.getStats(enhancedFilter);
  }

  /**
   * Get time series statistics for dashboard charts
   */
  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    await this.ensureInitialized();
    return this.storageProvider.getTimeSeriesStats(request);
  }

  /**
   * Delete a devlog entry
   */
  async deleteDevlog(id: DevlogId): Promise<void> {
    await this.ensureInitialized();

    const existing = await this.storageProvider.get(id);
    if (!existing) {
      throw new DevlogNotFoundError(id, { operation: 'deleteDevlog' });
    }

    await this.storageProvider.delete(id);

    // Emit deletion event
    await this.emitEvent({
      type: 'deleted',
      timestamp: new Date().toISOString(),
      data: { id, deletedEntry: existing },
    });
  }

  /**
   * Complete a devlog entry and archive it
   */
  async completeDevlog(id: DevlogId, summary?: string): Promise<DevlogEntry> {
    const updated = await this.updateDevlog({
      id,
      status: 'done',
    });

    if (summary) {
      return await this.addNote(id, `Completed: ${summary}`, 'progress');
    }

    return updated;
  }

  /**
   * Close a devlog entry (mark as cancelled without completion)
   */
  async closeDevlog(id: DevlogId, reason?: string): Promise<DevlogEntry> {
    const updated = await this.updateDevlog({
      id,
      status: 'cancelled',
    });

    if (reason) {
      return await this.addNote(id, `Cancelled: ${reason}`, 'progress');
    }

    return updated;
  }

  /**
   * Archive a devlog entry to reduce clutter in default views
   */
  async archiveDevlog(id: DevlogId): Promise<DevlogEntry> {
    return await this.updateDevlog({
      id,
      archived: true,
    });
  }

  /**
   * Unarchive a devlog entry to restore it to default views
   */
  async unarchiveDevlog(id: DevlogId): Promise<DevlogEntry> {
    return await this.updateDevlog({
      id,
      archived: false,
    });
  }

  /**
   * Get AI context for a devlog entry
   */
  async getContextForAI(id: DevlogId): Promise<DevlogEntry | null> {
    await this.ensureInitialized();
    return await this.storageProvider.get(id);
  }

  /**
   * Get active devlog entries for AI context
   */
  async getActiveContext(limit?: number): Promise<DevlogEntry[]> {
    await this.ensureInitialized();

    const filter = {
      status: ['new', 'in-progress', 'in-review', 'blocked', 'testing'] as any[],
    };

    const entries = await this.getAllDevlogsAsArray(filter);
    return entries.slice(0, limit || 10);
  }

  /**
   * Update AI context for a devlog entry
   * @deprecated Use updateDevlog with AI context fields instead. This method will be removed in v2.0.0.
   */
  async updateAIContext(
    id: DevlogId,
    context: Partial<DevlogEntry['aiContext']>,
  ): Promise<DevlogEntry> {
    await this.ensureInitialized();

    // Convert to updateDevlog call for consistency
    const updateRequest: UpdateDevlogRequest = {
      id,
      currentSummary: context?.currentSummary,
      keyInsights: context?.keyInsights,
      openQuestions: context?.openQuestions,
      suggestedNextSteps: context?.suggestedNextSteps,
    };

    return await this.updateDevlog(updateRequest);
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Unsubscribe from storage events
    if (this.storageUnsubscribe) {
      this.storageUnsubscribe();
      this.storageUnsubscribe = undefined;
    }

    if (this.storageProvider) {
      await this.storageProvider.cleanup();
    }

    this.initialized = false;
  }

  /**
   * Comprehensively discover related devlog entries before creating new work
   * Prevents duplicate work by finding relevant historical context
   */
  async discoverRelatedDevlogs(request: DiscoverDevlogsRequest): Promise<DiscoveryResult> {
    await this.ensureInitialized();

    const { workDescription, workType, keywords = [], scope } = request;

    // Build comprehensive search terms
    const searchTerms = [workDescription, workType, scope, ...keywords].filter(Boolean);

    // Get all entries for analysis
    const allEntries = await this.getAllDevlogsAsArray();
    const relatedEntries: DiscoveredDevlogEntry[] = [];

    // 1. Direct text matching in title/description/context
    for (const entry of allEntries) {
      const entryText =
        `${entry.title} ${entry.description} ${entry.context?.businessContext || ''} ${entry.context?.technicalContext || ''}`.toLowerCase();
      const matchedTerms = searchTerms.filter(
        (term): term is string => term !== undefined && entryText.includes(term.toLowerCase()),
      );

      if (matchedTerms.length > 0) {
        relatedEntries.push({
          entry,
          relevance: 'direct-text-match',
          matchedTerms,
        });
      }
    }

    // 2. Same type entries (if not already included)
    const sameTypeEntries = allEntries.filter(
      (entry) => entry.type === workType && !relatedEntries.some((r) => r.entry.key === entry.key),
    );

    for (const entry of sameTypeEntries) {
      relatedEntries.push({
        entry,
        relevance: 'same-type',
        matchedTerms: [workType],
      });
    }

    // 3. Keyword matching in notes and decisions
    for (const entry of allEntries) {
      if (relatedEntries.some((r) => r.entry.key === entry.key)) continue;

      const noteText = entry.notes
        .map((n) => n.content)
        .join(' ')
        .toLowerCase();
      const decisionText = (entry.context?.decisions || [])
        .map((d) => `${d.decision} ${d.rationale}`)
        .join(' ')
        .toLowerCase();
      const combinedText = `${noteText} ${decisionText}`;

      const matchedKeywords = keywords.filter(
        (keyword): keyword is string =>
          keyword !== undefined && combinedText.includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        relatedEntries.push({
          entry,
          relevance: 'keyword-in-notes',
          matchedTerms: matchedKeywords,
        });
      }
    }

    // Sort by relevance and status priority
    relatedEntries.sort((a, b) => {
      type RelevanceType = 'direct-text-match' | 'same-type' | 'keyword-in-notes';

      const relevanceOrder: Record<RelevanceType, number> = {
        'direct-text-match': 0,
        'same-type': 1,
        'keyword-in-notes': 2,
      };
      const statusOrder: Record<DevlogStatus, number> = {
        'in-progress': 0,
        'in-review': 1,
        new: 2,
        blocked: 3,
        testing: 4,
        done: 5,
        cancelled: 6,
      };

      const relevanceDiff =
        relevanceOrder[a.relevance as RelevanceType] - relevanceOrder[b.relevance as RelevanceType];
      if (relevanceDiff !== 0) return relevanceDiff;

      return statusOrder[a.entry.status] - statusOrder[b.entry.status];
    });

    // Calculate active entries and generate recommendation
    const activeCount = relatedEntries.filter((r) =>
      ['new', 'in-progress', 'in-review', 'testing'].includes(r.entry.status),
    ).length;

    const recommendation =
      activeCount > 0
        ? `⚠️ RECOMMENDATION: Review ${activeCount} active related entries before creating new work. Consider updating existing entries or coordinating efforts.`
        : relatedEntries.length > 0
          ? `✅ RECOMMENDATION: Related entries are completed. Safe to create new devlog entry, but review completed work for insights and patterns.`
          : `✅ RECOMMENDATION: No related work found. Safe to create new devlog entry.`;

    return {
      relatedEntries,
      activeCount,
      recommendation,
      searchParameters: request,
    };
  }

  // Private methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate semantic key for the entry (used for referencing and legacy compatibility)
   */
  private generateKey(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Batch update multiple devlog entries
   */
  async batchUpdate(request: BatchUpdateRequest): Promise<BatchOperationResult<DevlogEntry>> {
    await this.ensureInitialized();

    const result: BatchOperationResult<DevlogEntry> = {
      successful: [],
      failed: [],
      totalProcessed: request.ids.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const id of request.ids) {
      try {
        const updated = await this.updateDevlog({
          id,
          ...request.updates,
        });
        result.successful.push({ id, result: updated });
        result.successCount++;
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      }
    }

    return result;
  }

  /**
   * Batch delete multiple devlog entries
   */
  async batchDelete(request: BatchDeleteRequest): Promise<BatchOperationResult<void>> {
    await this.ensureInitialized();

    const result: BatchOperationResult<void> = {
      successful: [],
      failed: [],
      totalProcessed: request.ids.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const id of request.ids) {
      try {
        await this.deleteDevlog(id);
        result.successful.push({ id, result: undefined });
        result.successCount++;
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      }
    }

    return result;
  }

  /**
   * Add notes to multiple devlog entries
   */
  async batchAddNote(request: BatchNoteRequest): Promise<BatchOperationResult<DevlogEntry>> {
    await this.ensureInitialized();

    const result: BatchOperationResult<DevlogEntry> = {
      successful: [],
      failed: [],
      totalProcessed: request.ids.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const id of request.ids) {
      try {
        const updated = await this.addNote(id, request.content, request.category || 'progress', {
          files: request.files,
          codeChanges: request.codeChanges,
        });
        result.successful.push({ id, result: updated });
        result.successCount++;
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failureCount++;
      }
    }

    return result;
  }

  // Chat Management Methods

  /**
   * Get chat import service
   */
  getChatImportService() {
    const { DefaultChatImportService } = require('./services/chat-import-service.js');
    return new DefaultChatImportService(this.storageProvider);
  }

  /**
   * Get a chat session by ID
   */
  async getChatSession(sessionId: string) {
    await this.ensureInitialized();
    return this.storageProvider.getChatSession(sessionId);
  }

  /**
   * Get messages for a chat session
   */
  async getChatMessages(sessionId: string, offset = 0, limit = 100) {
    await this.ensureInitialized();
    return this.storageProvider.getChatMessages(sessionId, offset, limit);
  }

  /**
   * List chat sessions with filtering
   */
  async listChatSessions(filter: any = {}, offset = 0, limit = 20) {
    await this.ensureInitialized();
    return this.storageProvider.listChatSessions(filter, offset, limit);
  }

  /**
   * Search chat content
   */
  async searchChatContent(query: string, filter: any = {}, limit = 50) {
    await this.ensureInitialized();
    return this.storageProvider.searchChatContent(query, filter, limit);
  }

  /**
   * Save a chat-devlog link
   */
  async saveChatDevlogLink(link: any) {
    await this.ensureInitialized();
    return this.storageProvider.saveChatDevlogLink(link);
  }

  /**
   * Remove a chat-devlog link
   */
  async removeChatDevlogLink(sessionId: string, devlogId: number) {
    await this.ensureInitialized();
    return this.storageProvider.removeChatDevlogLink(sessionId, devlogId);
  }

  /**
   * Get chat statistics
   */
  async getChatStats(filter: any = {}) {
    await this.ensureInitialized();
    return this.storageProvider.getChatStats(filter);
  }

  /**
   * Update a chat session
   */
  async updateChatSession(sessionId: string, updates: any) {
    await this.ensureInitialized();

    // Get existing session
    const existingSession = await this.storageProvider.getChatSession(sessionId);
    if (!existingSession) {
      throw new DevlogNotFoundError(`Chat session not found: ${sessionId}`);
    }

    // Apply updates
    const updatedSession = {
      ...existingSession,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Save updated session
    await this.storageProvider.saveChatSession(updatedSession);
    return updatedSession;
  }

  /**
   * Get chat workspaces
   */
  async getChatWorkspaces() {
    await this.ensureInitialized();
    return this.storageProvider.getChatWorkspaces();
  }
}
