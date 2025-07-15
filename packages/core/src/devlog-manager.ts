/**
 * DevlogManager that uses the storage provider abstraction
 * This provides a flexible architecture supporting multiple storage backends
 */

import * as crypto from 'crypto';
import type {
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
  NoteCategory,
  StorageProvider,
  TimeSeriesDataPoint,
  TimeSeriesRequest,
  TimeSeriesStats,
  UpdateDevlogRequest,
} from './types/index.js';
import { StorageProviderFactory } from './storage/storage-provider.js';
import { ConfigurationManager } from './configuration-manager.js';
import { DevlogNotFoundError, DevlogStorageError, logger, handleAsyncOperation } from './utils/errors.js';

export class DevlogManager {
  private storageProvider!: StorageProvider;
  // TODO: Uncomment when integrations are implemented
  // private integrationService!: IntegrationService;
  // private readonly integrations?: EnterpriseIntegration;
  // private readonly syncStrategy?: SyncStrategy;
  private readonly configManager: ConfigurationManager;
  private initialized = false;

  constructor() {
    // TODO: integrations and syncStrategy can be configured later
    // this.integrations = options.integrations;
    // this.syncStrategy = options.syncStrategy;
    this.configManager = new ConfigurationManager();
  }

  /**
   * Initialize the storage provider based on configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = await this.configManager.loadConfig();
    console.debug('Initialized devlog config', config);

    this.storageProvider = await StorageProviderFactory.create(config.storage!);
    await this.storageProvider.initialize();

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
    if (request.status !== undefined) updated.status = request.status;
    if (request.priority !== undefined) updated.priority = request.priority;
    if (request.assignee !== undefined) updated.assignee = request.assignee;
    if (request.files !== undefined) updated.files = request.files;

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
    const updated = await this.updateDevlog({ ...updates, id });

    // Then add the progress note
    return await this.addNote(id, progressNote, options?.category || 'progress', {
      files: options?.files,
      codeChanges: options?.codeChanges,
    });
  }

  /**
   * List devlog entries with optional filtering
   */
  async listDevlogs(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    await this.ensureInitialized();
    return await this.storageProvider.list(filter);
  }

  /**
   * Search devlog entries
   */
  async searchDevlogs(query: string): Promise<DevlogEntry[]> {
    await this.ensureInitialized();
    return await this.storageProvider.search(query);
  }

  /**
   * Get devlog statistics
   */
  async getStats(): Promise<DevlogStats> {
    await this.ensureInitialized();
    return await this.storageProvider.getStats();
  }

  /**
   * Get time series statistics for dashboard charts
   */
  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    await this.ensureInitialized();

    // Set defaults
    const days = request.days || 30;
    const endDate = request.to ? new Date(request.to) : new Date();
    const startDate = request.from
      ? new Date(request.from)
      : new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all devlogs to analyze
    const allDevlogs = await this.storageProvider.list();

    // Create time series data points
    const dataPoints: TimeSeriesDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Count devlogs created on this date
      const created = allDevlogs.filter((devlog: DevlogEntry) => {
        const createdDate = new Date(devlog.createdAt).toISOString().split('T')[0];
        return createdDate === dateStr;
      }).length;

      // Count devlogs completed on this date (status changed to 'done')
      const completed = allDevlogs.filter((devlog: DevlogEntry) => {
        if (devlog.status !== 'done') return false;

        // Check if completed on this date (simplified - using updatedAt as proxy)
        const updatedDate = new Date(devlog.updatedAt).toISOString().split('T')[0];
        return updatedDate === dateStr;
      }).length;

      // Count current status distribution at end of this date
      // For simplicity, we'll use current status distribution
      // In a real implementation, you'd track status changes over time
      const statusCounts = allDevlogs.reduce(
        (acc: Record<DevlogStatus, number>, devlog: DevlogEntry) => {
          const createdDate = new Date(devlog.createdAt);
          if (createdDate <= currentDate) {
            acc[devlog.status] = (acc[devlog.status] || 0) + 1;
          }
          return acc;
        },
        {} as Record<DevlogStatus, number>,
      );

      dataPoints.push({
        date: dateStr,
        created,
        completed,
        inProgress: statusCounts['in-progress'] || 0,
        inReview: statusCounts['in-review'] || 0,
        testing: statusCounts['testing'] || 0,
        new: statusCounts['new'] || 0,
        blocked: statusCounts['blocked'] || 0,
        done: statusCounts['done'] || 0,
        closed: statusCounts['closed'] || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      dataPoints,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
    };
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

    const entries = await this.storageProvider.list(filter);
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
    if (this.storageProvider) {
      await this.storageProvider.cleanup();
    }
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
    const allEntries = await this.listDevlogs();
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
        closed: 6,
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
}
