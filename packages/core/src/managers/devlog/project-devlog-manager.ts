/**
 * Project-aware DevlogManager
 *
 * Manages devlog entries within project contexts using centralized storage configuration.
 * Replaces the complex workspace-based system with a simpler project-filtered approach.
 */

import type {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../../types/index.js';
import type { ProjectContext } from '../../types/project.js';
import { StorageProviderFactory } from '../../storage/index.js';
import type { StorageConfig } from '../../types/storage.js';

export interface ProjectDevlogManagerOptions {
  /** Storage configuration for the entire application */
  storageConfig: StorageConfig;

  /** Project context for filtering operations */
  projectContext?: ProjectContext;
}

/**
 * Project-aware devlog manager with centralized storage
 */
export class ProjectDevlogManager {
  private storageProvider: StorageProvider | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private options: ProjectDevlogManagerOptions) {}

  /**
   * Initialize the devlog manager
   * Protects against race conditions during concurrent initialization
   */
  async initialize(): Promise<void> {
    // If initialization is in progress, wait for it
    if (this.initPromise) {
      console.log('⏳ ProjectDevlogManager initialization in progress, waiting...');
      return this.initPromise;
    }

    console.log('🚀 Initializing ProjectDevlogManager...');

    // Create initialization promise to prevent race conditions
    this.initPromise = this.performInitialization();

    try {
      await this.initPromise;
    } catch (error) {
      // Clear promise on failure so next call can retry
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Internal method to perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      if (this.options.projectContext) {
        console.log(`📂 Project context: ${this.options.projectContext.projectId}`);
      } else {
        console.log('📂 No project context configured');
      }

      console.log(`💾 Storage type: ${this.options.storageConfig.type}`);

      // StorageProviderFactory.create() already initializes the provider
      this.storageProvider = await StorageProviderFactory.create(this.options.storageConfig);
      console.log('✅ ProjectDevlogManager initialized successfully');
    } catch (error) {
      console.error('❌ ProjectDevlogManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.storageProvider) {
      await this.storageProvider.cleanup();
      this.storageProvider = null;
    }
  }

  /**
   * Set the current project context
   */
  setProjectContext(projectContext: ProjectContext): void {
    this.options.projectContext = projectContext;
  }

  /**
   * Get the current project context
   */
  getProjectContext(): ProjectContext | undefined {
    return this.options.projectContext;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.storageProvider) {
      await this.initialize();
    }
  }

  /**
   * Add project filter to devlog filter if project context is available
   */
  private addProjectFilter(filter?: DevlogFilter): DevlogFilter {
    const projectFilter: DevlogFilter = { ...filter };

    // Add project-specific filtering using projectId
    if (this.options.projectContext) {
      projectFilter.projectId = this.options.projectContext.projectId;
    }

    return projectFilter;
  }

  /**
   * Add project ID to devlog entry
   */
  private addProjectId(entry: DevlogEntry): DevlogEntry {
    if (!this.options.projectContext) {
      return entry;
    }

    const updatedEntry = { ...entry };
    updatedEntry.projectId = this.options.projectContext.projectId;

    return updatedEntry;
  }

  // Delegate all operations to storage provider with project filtering

  async exists(id: DevlogId): Promise<boolean> {
    await this.ensureInitialized();
    return this.storageProvider!.exists(id);
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    await this.ensureInitialized();
    const entry = await this.storageProvider!.get(id);

    // Verify entry belongs to current project if project context is set
    if (entry && this.options.projectContext) {
      if (entry.projectId !== this.options.projectContext.projectId) {
        return null; // Entry doesn't belong to current project
      }
    }

    return entry;
  }

  async save(entry: DevlogEntry): Promise<void> {
    await this.ensureInitialized();
    const projectEntry = this.addProjectId(entry);
    return this.storageProvider!.save(projectEntry);
  }

  async delete(id: DevlogId): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.delete(id);
  }

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);
    return this.storageProvider!.list(projectFilter);
  }

  async search(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);
    return this.storageProvider!.search(query, projectFilter);
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    await this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);
    return this.storageProvider!.getStats(projectFilter);
  }

  async getTimeSeriesStats(request?: TimeSeriesRequest): Promise<TimeSeriesStats> {
    await this.ensureInitialized();
    return this.storageProvider!.getTimeSeriesStats(request);
  }

  async getNextId(): Promise<DevlogId> {
    await this.ensureInitialized();
    return this.storageProvider!.getNextId();
  }

  // Delegate chat operations (these are not project-specific for now)

  async saveChatSession(session: any): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.saveChatSession(session);
  }

  async getChatSession(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.storageProvider!.getChatSession(id);
  }

  async listChatSessions(filter?: any, offset?: number, limit?: number): Promise<any[]> {
    await this.ensureInitialized();
    return this.storageProvider!.listChatSessions(filter, offset, limit);
  }

  async deleteChatSession(id: string): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.deleteChatSession(id);
  }

  async saveChatMessages(messages: any[]): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.saveChatMessages(messages);
  }

  async getChatMessages(sessionId: string, offset?: number, limit?: number): Promise<any[]> {
    await this.ensureInitialized();
    return this.storageProvider!.getChatMessages(sessionId, offset, limit);
  }

  async searchChatContent(query: string, filter?: any, limit?: number): Promise<any[]> {
    await this.ensureInitialized();
    return this.storageProvider!.searchChatContent(query, filter, limit);
  }

  async getChatStats(filter?: any): Promise<any> {
    await this.ensureInitialized();
    return this.storageProvider!.getChatStats(filter);
  }

  async saveChatDevlogLink(link: any): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.saveChatDevlogLink(link);
  }

  async getChatDevlogLinks(sessionId?: string, devlogId?: DevlogId): Promise<any[]> {
    await this.ensureInitialized();
    return this.storageProvider!.getChatDevlogLinks(sessionId, devlogId);
  }

  async removeChatDevlogLink(sessionId: string, devlogId: DevlogId): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.removeChatDevlogLink(sessionId, devlogId);
  }

  async getChatWorkspaces(): Promise<any[]> {
    await this.ensureInitialized();
    return this.storageProvider!.getChatWorkspaces();
  }

  async saveChatWorkspace(workspace: any): Promise<void> {
    await this.ensureInitialized();
    return this.storageProvider!.saveChatWorkspace(workspace);
  }
}
