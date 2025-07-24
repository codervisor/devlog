/**
 * Workspace-aware DevlogManager that supports multiple workspace configurations
 * and seamless switching between different storage backends
 */

import { join } from 'path';
import { homedir } from 'os';
import * as crypto from 'crypto';
import type {
  CreateDevlogRequest,
  DevlogEntry,
  DevlogEvent,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogStats,
  DiscoverDevlogsRequest,
  DiscoveryResult,
  PaginatedResult,
  StorageConfig,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
  WorkspaceContext,
  WorkspaceMetadata,
} from '../../types/index.js';
import { StorageProviderFactory } from '../../storage/storage-provider.js';
import { ConfigurationManager } from '../configuration/configuration-manager.js';
import { FileWorkspaceManager, type WorkspaceManagerOptions } from '../workspace/index.js';
import { getDevlogEvents } from '../../events/devlog-events.js';

export interface WorkspaceDevlogManagerOptions {
  /** Path to workspace configuration file */
  workspaceConfigPath?: string;
  /** Whether to create workspace config if missing */
  createWorkspaceConfigIfMissing?: boolean;
  /** Fallback to environment configuration if no workspace config */
  fallbackToEnvConfig?: boolean;
}

export class WorkspaceDevlogManager {
  private workspaceManager: FileWorkspaceManager;
  private configManager: ConfigurationManager;
  private storageProviders = new Map<string, StorageProvider>();
  private currentWorkspaceId: string | null = null;
  private initialized = false;
  private storageSubscriptions = new Map<string, () => void>(); // workspace -> unsubscribe function

  constructor(private options: WorkspaceDevlogManagerOptions = {}) {
    const workspaceManagerOptions: WorkspaceManagerOptions = {
      configPath: options.workspaceConfigPath || join(homedir(), '.devlog', 'workspaces.json'),
      createIfMissing: options.createWorkspaceConfigIfMissing ?? true,
    };

    this.workspaceManager = new FileWorkspaceManager(workspaceManagerOptions);
    this.configManager = new ConfigurationManager();
  }

  /**
   * Initialize workspace manager and load default workspace
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load workspace configuration
      const defaultWorkspaceId = await this.workspaceManager.getDefaultWorkspace();
      await this.switchToWorkspace(defaultWorkspaceId);
      this.initialized = true;
    } catch (error) {
      if (this.options.fallbackToEnvConfig) {
        // Fallback to traditional environment-based configuration
        console.warn('Workspace configuration not found, falling back to environment variables');
        await this.initializeFallbackMode();
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize in fallback mode using environment configuration
   */
  private async initializeFallbackMode(): Promise<void> {
    const config = await this.configManager.loadConfig();
    const provider = await StorageProviderFactory.create(config.storage!);
    await provider.initialize();

    // Store fallback provider with special key
    this.storageProviders.set('__fallback__', provider);
    this.currentWorkspaceId = '__fallback__';

    // Subscribe to storage events in fallback mode
    await this.subscribeToStorageEvents('__fallback__');
  }

  /**
   * Get list of all available workspaces
   */
  async listWorkspaces(): Promise<WorkspaceMetadata[]> {
    return this.workspaceManager.listWorkspaces();
  }

  /**
   * Get current workspace context
   */
  async getCurrentWorkspace(): Promise<WorkspaceContext | null> {
    if (this.currentWorkspaceId === '__fallback__') {
      return null; // Fallback mode has no workspace context
    }
    return this.workspaceManager.getCurrentWorkspace();
  }

  /**
   * Switch to a different workspace
   */
  async switchToWorkspace(workspaceId: string): Promise<WorkspaceContext> {
    // Get workspace configuration
    const workspaceConfig = await this.workspaceManager.getWorkspaceConfig(workspaceId);
    if (!workspaceConfig) {
      throw new Error(`Workspace '${workspaceId}' not found`);
    }

    // Initialize storage provider for this workspace if not already done
    // Skip expensive initialization for fast switching - will be done lazily
    if (!this.storageProviders.has(workspaceId)) {
      const provider = await StorageProviderFactory.create(workspaceConfig.storage);
      // Skip provider.initialize() for fast switching
      this.storageProviders.set(workspaceId, provider);
    }

    // Unsubscribe from previous workspace events if switching
    if (this.currentWorkspaceId && this.storageSubscriptions.has(this.currentWorkspaceId)) {
      const unsubscribe = this.storageSubscriptions.get(this.currentWorkspaceId);
      if (unsubscribe) {
        unsubscribe();
        this.storageSubscriptions.delete(this.currentWorkspaceId);
      }
    }

    // Switch to workspace
    const context = await this.workspaceManager.switchToWorkspace(workspaceId);
    this.currentWorkspaceId = workspaceId;

    // Subscribe to storage events for cross-process synchronization
    await this.subscribeToStorageEvents(workspaceId);

    return context;
  }

  /**
   * Create a new workspace with storage configuration
   */
  async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: StorageConfig,
  ): Promise<WorkspaceMetadata> {
    const createdWorkspace = await this.workspaceManager.createWorkspace(workspace, storage);

    // Initialize storage provider immediately
    const provider = await StorageProviderFactory.create(storage);
    await provider.initialize();
    this.storageProviders.set(workspace.id, provider);

    return createdWorkspace;
  }

  /**
   * Delete a workspace and its storage provider
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    // Unsubscribe from storage events
    if (this.storageSubscriptions.has(workspaceId)) {
      const unsubscribe = this.storageSubscriptions.get(workspaceId);
      if (unsubscribe) {
        unsubscribe();
        this.storageSubscriptions.delete(workspaceId);
        console.log(
          `[WorkspaceDevlogManager] Unsubscribed from storage events for workspace '${workspaceId}'`,
        );
      }
    }

    // Clean up storage provider
    const provider = this.storageProviders.get(workspaceId);
    if (provider && provider.cleanup) {
      await provider.cleanup();
    }
    this.storageProviders.delete(workspaceId);

    // Delete workspace configuration
    await this.workspaceManager.deleteWorkspace(workspaceId);

    // If this was the current workspace, switch to default
    if (this.currentWorkspaceId === workspaceId) {
      const defaultWorkspaceId = await this.workspaceManager.getDefaultWorkspace();
      await this.switchToWorkspace(defaultWorkspaceId);
    }
  }

  /**
   * Get storage configuration for a workspace
   */
  async getWorkspaceStorage(workspaceId: string): Promise<StorageConfig | null> {
    return this.workspaceManager.getWorkspaceStorage(workspaceId);
  }

  /**
   * Subscribe to storage events for cross-process communication
   * @private
   */
  private async subscribeToStorageEvents(workspaceId: string): Promise<void> {
    const provider = this.storageProviders.get(workspaceId);
    if (!provider || !provider.subscribe) {
      console.log(
        `[WorkspaceDevlogManager] Storage provider for workspace '${workspaceId}' does not support subscriptions`,
      );
      return;
    }

    try {
      // Ensure provider is initialized before subscribing
      if (!(provider as any).initialized) {
        console.log(
          `[WorkspaceDevlogManager] Initializing storage provider for workspace '${workspaceId}' before subscription`,
        );
        await provider.initialize();
      }

      console.log(
        `[WorkspaceDevlogManager] Subscribing to storage events for workspace '${workspaceId}'`,
      );
      const unsubscribe = await provider.subscribe(this.handleStorageEvent.bind(this));
      this.storageSubscriptions.set(workspaceId, unsubscribe);
      console.log(
        `[WorkspaceDevlogManager] Successfully subscribed to storage events for workspace '${workspaceId}'`,
      );
    } catch (error) {
      console.error(
        `[WorkspaceDevlogManager] Failed to subscribe to storage events for workspace '${workspaceId}':`,
        error,
      );
    }
  }

  /**
   * Handle storage events and forward them to local event emitter
   * @private
   */
  private async handleStorageEvent(event: DevlogEvent): Promise<void> {
    try {
      console.log(
        `[WorkspaceDevlogManager] Received storage event:`,
        event.type,
        'for ID:',
        event.data?.id,
      );
      const devlogEvents = getDevlogEvents();
      await devlogEvents.emit(event);
    } catch (error) {
      console.error('[WorkspaceDevlogManager] Error handling storage event:', error);
    }
  }

  /**
   * Test connection to a workspace's storage
   */
  async testWorkspaceConnection(
    workspaceId: string,
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      const provider = this.storageProviders.get(workspaceId);
      if (!provider) {
        const workspaceConfig = await this.workspaceManager.getWorkspaceConfig(workspaceId);
        if (!workspaceConfig) {
          return { connected: false, error: 'Workspace not found' };
        }

        // Try to create and initialize provider
        const testProvider = await StorageProviderFactory.create(workspaceConfig.storage);
        await testProvider.initialize();

        // Store for future use
        this.storageProviders.set(workspaceId, testProvider);
        return { connected: true };
      }

      // Test if provider is responsive (try a simple operation)
      await provider.getNextId();
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current storage provider
   */
  private async getCurrentStorageProvider(): Promise<StorageProvider> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    const provider = this.storageProviders.get(this.currentWorkspaceId);
    if (!provider) {
      throw new Error(`Storage provider not initialized for workspace: ${this.currentWorkspaceId}`);
    }

    // Perform lazy initialization if not already done
    if (!(provider as any).initialized) {
      await provider.initialize();
    }

    return provider;
  }

  /**
   * Get storage provider for a specific workspace
   */
  async getWorkspaceStorageProvider(workspaceId: string): Promise<StorageProvider> {
    let provider = this.storageProviders.get(workspaceId);

    if (!provider) {
      // Initialize provider on demand
      const workspaceConfig = await this.workspaceManager.getWorkspaceConfig(workspaceId);
      if (!workspaceConfig) {
        throw new Error(`Workspace '${workspaceId}' not found`);
      }

      provider = await StorageProviderFactory.create(workspaceConfig.storage);
      await provider.initialize();
      this.storageProviders.set(workspaceId, provider);
    }

    return provider;
  }

  // Delegate all DevlogManager methods to current storage provider

  async listDevlogs(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const provider = await this.getCurrentStorageProvider();
    return provider.list(filter);
  }

  async getDevlog(id: string | number): Promise<DevlogEntry | null> {
    const provider = await this.getCurrentStorageProvider();
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return provider.get(numericId);
  }

  async createDevlog(request: CreateDevlogRequest): Promise<DevlogEntry> {
    const provider = await this.getCurrentStorageProvider();
    const id = await provider.getNextId();

    // Proper field mapping similar to DevlogManager.createDevlog
    const now = new Date().toISOString();
    const entry: DevlogEntry = {
      id,
      key: this.generateKey(request.title),
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

    await provider.save(entry);

    // Emit event for real-time updates
    console.log('[WorkspaceDevlogManager] About to emit devlog-created event for ID:', id);
    const devlogEvents = getDevlogEvents();
    console.log(
      '[WorkspaceDevlogManager] Event handlers count:',
      devlogEvents.getHandlerCount('created'),
    );
    try {
      await devlogEvents.emit({
        type: 'created',
        data: entry,
        timestamp: now,
      });
      console.log('[WorkspaceDevlogManager] Successfully emitted devlog-created event for ID:', id);
    } catch (error) {
      console.error('[WorkspaceDevlogManager] Error emitting devlog-created event:', error);
    }

    return entry;
  }

  async updateDevlog(id: string | number, data: any): Promise<DevlogEntry> {
    const provider = await this.getCurrentStorageProvider();
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const existing = await provider.get(numericId);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    const now = new Date().toISOString();

    // Separate context fields from AI context fields from direct fields
    const {
      // Context fields (should go into context object)
      businessContext,
      technicalContext,
      acceptanceCriteria,
      initialInsights,
      relatedPatterns,
      // AI context fields (should go into aiContext object)
      currentSummary,
      keyInsights,
      openQuestions,
      suggestedNextSteps,
      // All other fields are direct updates
      ...directFields
    } = data;

    // Build the updated entry with proper field mapping
    const updated: DevlogEntry = {
      ...existing,
      ...directFields,
      updatedAt: now,
    };

    // Update context object if any context fields are provided
    if (
      businessContext !== undefined ||
      technicalContext !== undefined ||
      acceptanceCriteria !== undefined ||
      initialInsights !== undefined ||
      relatedPatterns !== undefined
    ) {
      updated.context = {
        ...existing.context,
        ...(businessContext !== undefined && { businessContext }),
        ...(technicalContext !== undefined && { technicalContext }),
        ...(acceptanceCriteria !== undefined && { acceptanceCriteria }),
        ...(initialInsights !== undefined && { initialInsights }),
        ...(relatedPatterns !== undefined && { relatedPatterns }),
      };
    }

    // Update aiContext object if any AI context fields are provided
    if (
      currentSummary !== undefined ||
      keyInsights !== undefined ||
      openQuestions !== undefined ||
      suggestedNextSteps !== undefined
    ) {
      updated.aiContext = {
        ...existing.aiContext,
        ...(currentSummary !== undefined && { currentSummary }),
        ...(keyInsights !== undefined && { keyInsights }),
        ...(openQuestions !== undefined && { openQuestions }),
        ...(suggestedNextSteps !== undefined && { suggestedNextSteps }),
        lastAIUpdate: now,
        contextVersion: (existing.aiContext?.contextVersion || 0) + 1,
      };
    }

    // Ensure closedAt is set when status changes to 'done' or 'cancelled'
    if (data.status && ['done', 'cancelled'].includes(data.status) && !updated.closedAt) {
      updated.closedAt = now;
    }

    await provider.save(updated);

    // Emit event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'updated',
      data: updated,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Delete a devlog entry (soft delete using archive)
   * @deprecated This method now performs soft deletion via archiving.
   * Use archiveDevlog() directly for clarity.
   */
  async deleteDevlog(id: string | number): Promise<void> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Get the entry before archiving for event emission
    const existing = await this.getDevlog(numericId);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    // Use archive instead of hard delete
    await this.archiveDevlog(numericId);

    // Emit event for real-time updates (keeping 'deleted' for backward compatibility)
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'deleted',
      data: existing,
      timestamp: new Date().toISOString(),
    });
  }

  async searchDevlogs(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const provider = await this.getCurrentStorageProvider();
    // Pass the filter to the storage provider to ensure proper filtering (including archived exclusion)
    return provider.search(query, filter);
  }

  /**
   * List devlogs from a specific workspace
   */
  async listDevlogsFromWorkspace(
    workspaceId: string,
    filter?: DevlogFilter,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const provider = await this.getWorkspaceStorageProvider(workspaceId);
    return provider.list(filter);
  }

  /**
   * Get devlog from a specific workspace
   */
  async getDevlogFromWorkspace(
    workspaceId: string,
    id: string | number,
  ): Promise<DevlogEntry | null> {
    const provider = await this.getWorkspaceStorageProvider(workspaceId);
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return provider.get(numericId);
  }

  /**
   * Get devlog statistics for current workspace
   * @param filter Optional filter to apply when calculating statistics
   */
  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    const provider = await this.getCurrentStorageProvider();
    return provider.getStats(filter);
  }

  /**
   * Get time series statistics for dashboard charts from current workspace
   */
  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    const provider = await this.getCurrentStorageProvider();
    return provider.getTimeSeriesStats(request);
  }

  /**
   * Add a note to a devlog entry in current workspace
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
    const existing = await this.getDevlog(id);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
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
      notes: [...(existing.notes || []), note],
      updatedAt: new Date().toISOString(),
    };

    const provider = await this.getCurrentStorageProvider();
    await provider.save(updated);

    // Emit note-added event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'note-added',
      data: { note, devlog: updated },
      timestamp: note.timestamp,
    });

    return updated;
  }

  /**
   * Complete a devlog entry and archive it
   */
  async completeDevlog(id: DevlogId, summary?: string): Promise<DevlogEntry> {
    const existing = await this.getDevlog(id);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: DevlogEntry = {
      ...existing,
      status: 'done',
      updatedAt: now,
      closedAt: now,
    };

    if (summary) {
      await this.addNote(id, `Completed: ${summary}`, 'progress');
    }

    const provider = await this.getCurrentStorageProvider();
    await provider.save(updated);

    // Emit completion event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'completed',
      data: updated,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Close a devlog entry by setting status to cancelled
   */
  async closeDevlog(id: DevlogId, reason?: string): Promise<DevlogEntry> {
    const existing = await this.getDevlog(id);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: DevlogEntry = {
      ...existing,
      status: 'cancelled',
      updatedAt: now,
      closedAt: now,
    };

    if (reason) {
      await this.addNote(id, `Cancelled: ${reason}`, 'progress');
    }

    const provider = await this.getCurrentStorageProvider();
    await provider.save(updated);

    // Emit close event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'closed',
      data: updated,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Archive a devlog entry
   */
  async archiveDevlog(id: DevlogId): Promise<DevlogEntry> {
    const existing = await this.getDevlog(id);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    const updated: DevlogEntry = {
      ...existing,
      archived: true,
      updatedAt: new Date().toISOString(),
    };

    const provider = await this.getCurrentStorageProvider();
    await provider.save(updated);

    // Emit archive event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'archived',
      data: updated,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Unarchive a devlog entry
   */
  async unarchiveDevlog(id: DevlogId): Promise<DevlogEntry> {
    const existing = await this.getDevlog(id);
    if (!existing) {
      throw new Error(`Devlog ${id} not found`);
    }

    const updated: DevlogEntry = {
      ...existing,
      archived: false,
      updatedAt: new Date().toISOString(),
    };

    const provider = await this.getCurrentStorageProvider();
    await provider.save(updated);

    // Emit unarchive event for real-time updates
    const devlogEvents = getDevlogEvents();
    await devlogEvents.emit({
      type: 'unarchived',
      data: updated,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Get context for AI - simplified version
   */
  async getContextForAI(id: DevlogId): Promise<DevlogEntry> {
    const entry = await this.getDevlog(id);
    if (!entry) {
      throw new Error(`Devlog ${id} not found`);
    }
    return entry;
  }

  /**
   * Update AI context - simplified to just update the devlog
   */
  async updateAIContext(id: DevlogId, contextUpdate: any): Promise<DevlogEntry> {
    return this.updateDevlog(id, contextUpdate);
  }

  /**
   * Discover related devlogs - proper implementation with relevance and matched terms
   */
  async discoverRelatedDevlogs(request: DiscoverDevlogsRequest): Promise<DiscoveryResult> {
    // Get all devlogs from current workspace
    const allDevlogs = await this.listDevlogs();
    const entries = allDevlogs.items || [];

    const relatedEntries = [];
    const keywords = request.keywords || [];
    const workDescription = request.workDescription.toLowerCase();

    for (const entry of entries) {
      const matchedTerms: string[] = [];
      let relevance: 'direct-text-match' | 'same-type' | 'keyword-in-notes' | null = null;

      // Check for direct text matches in title or description
      const titleMatch = entry.title.toLowerCase().includes(workDescription);
      const descMatch = entry.description.toLowerCase().includes(workDescription);

      if (titleMatch || descMatch) {
        relevance = 'direct-text-match';
        matchedTerms.push(workDescription);
      }

      // Check for same type
      if (entry.type === request.workType && !relevance) {
        relevance = 'same-type';
        matchedTerms.push(entry.type);
      }

      // Check for keyword matches in notes
      if (keywords.length > 0 && !relevance) {
        const notesText = (entry.notes || [])
          .map((note) => note.content)
          .join(' ')
          .toLowerCase();
        for (const keyword of keywords) {
          if (notesText.includes(keyword.toLowerCase())) {
            relevance = 'keyword-in-notes';
            matchedTerms.push(keyword);
          }
        }
      }

      // Check for keyword matches in title/description if no other match
      if (keywords.length > 0 && !relevance) {
        const entryText = `${entry.title} ${entry.description}`.toLowerCase();
        for (const keyword of keywords) {
          if (entryText.includes(keyword.toLowerCase())) {
            relevance = 'direct-text-match';
            matchedTerms.push(keyword);
          }
        }
      }

      if (relevance && matchedTerms.length > 0) {
        relatedEntries.push({
          entry,
          relevance,
          matchedTerms,
        });
      }
    }

    // Sort by relevance priority: direct-text-match > same-type > keyword-in-notes
    relatedEntries.sort((a, b) => {
      const relevanceOrder = { 'direct-text-match': 3, 'same-type': 2, 'keyword-in-notes': 1 };
      return relevanceOrder[b.relevance] - relevanceOrder[a.relevance];
    });

    const activeCount = relatedEntries.filter(
      ({ entry }) => !entry.archived && entry.status !== 'done' && entry.status !== 'cancelled',
    ).length;

    const recommendation =
      activeCount > 0
        ? `⚠️ RECOMMENDATION: Review ${activeCount} active related entries before creating new work. Consider updating existing entries or coordinating efforts.`
        : 'No active related entries found. You can proceed with creating new work.';

    return {
      relatedEntries,
      activeCount,
      recommendation,
      searchParameters: request,
    };
  }

  /**
   * Update devlog with progress note
   */
  async updateWithProgress(
    id: DevlogId,
    updates: any,
    progressNote?: string,
    options?: any,
  ): Promise<DevlogEntry> {
    const updated = await this.updateDevlog(id, updates);

    if (progressNote) {
      await this.addNote(id, progressNote, options?.category || 'progress', {
        files: options?.files,
        codeChanges: options?.codeChanges,
      });

      // Get the latest version with the note added
      return (await this.getDevlog(id)) || updated;
    }

    return updated;
  }

  /**
   * Cleanup all storage providers
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from all storage events
    for (const [workspaceId, unsubscribe] of this.storageSubscriptions) {
      try {
        unsubscribe();
        console.log(
          `[WorkspaceDevlogManager] Unsubscribed from storage events for workspace '${workspaceId}'`,
        );
      } catch (error) {
        console.error(
          `Error unsubscribing from storage events for workspace ${workspaceId}:`,
          error,
        );
      }
    }
    this.storageSubscriptions.clear();

    // Cleanup storage providers
    for (const [workspaceId, provider] of this.storageProviders) {
      if (provider.cleanup) {
        try {
          await provider.cleanup();
        } catch (error) {
          console.error(`Error cleaning up workspace ${workspaceId}:`, error);
        }
      }
    }
    this.storageProviders.clear();
  }

  /**
   * Generate a semantic key from title
   */
  private generateKey(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}
