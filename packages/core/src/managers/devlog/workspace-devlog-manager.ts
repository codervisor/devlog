/**
 * Workspace-aware DevlogManager that supports multiple workspace configurations
 * and seamless switching between different storage backends
 */

import { DevlogManager } from './devlog-manager.js';
import { FileWorkspaceManager, type WorkspaceManagerOptions } from '../workspace/workspace-manager.js';
import { StorageProviderFactory } from '../../storage/storage-provider.js';
import { ConfigurationManager } from '../configuration/configuration-manager.js';
import type {
    StorageProvider,
    WorkspaceMetadata,
    WorkspaceContext,
    WorkspaceConfiguration,
    DevlogFilter,
    PaginatedResult,
    DevlogEntry,
    StorageConfig,
} from '../../types/index.js';
import { join } from 'path';
import { homedir } from 'os';

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

        // Switch to workspace
        const context = await this.workspaceManager.switchToWorkspace(workspaceId);
        this.currentWorkspaceId = workspaceId;

        return context;
    }

    /**
     * Create a new workspace with storage configuration
     */
    async createWorkspace(
        workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
        storage: StorageConfig
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
     * Test connection to a workspace's storage
     */
    async testWorkspaceConnection(workspaceId: string): Promise<{ connected: boolean; error?: string }> {
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
            const nextId = await provider.getNextId();
            return { connected: true };
        } catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
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

    async listDevlogs(filter?: DevlogFilter, options?: any): Promise<PaginatedResult<DevlogEntry>> {
        const provider = await this.getCurrentStorageProvider();
        return provider.list(filter);
    }

    async getDevlog(id: string | number): Promise<DevlogEntry | null> {
        const provider = await this.getCurrentStorageProvider();
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        return provider.get(numericId);
    }

    async createDevlog(data: any): Promise<DevlogEntry> {
        const provider = await this.getCurrentStorageProvider();
        const id = await provider.getNextId();
        const entry: DevlogEntry = {
            id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await provider.save(entry);
        return entry;
    }

    async updateDevlog(id: string | number, data: any): Promise<DevlogEntry> {
        const provider = await this.getCurrentStorageProvider();
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        const existing = await provider.get(numericId);
        if (!existing) {
            throw new Error(`Devlog ${id} not found`);
        }

        const updated: DevlogEntry = {
            ...existing,
            ...data,
            updatedAt: new Date(),
        };
        await provider.save(updated);
        return updated;
    }

    async deleteDevlog(id: string | number): Promise<void> {
        const provider = await this.getCurrentStorageProvider();
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        return provider.delete(numericId);
    }

    async searchDevlogs(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
        const provider = await this.getCurrentStorageProvider();
        return provider.search(query);
    }

    /**
     * List devlogs from a specific workspace
     */
    async listDevlogsFromWorkspace(
        workspaceId: string,
        filter?: DevlogFilter
    ): Promise<PaginatedResult<DevlogEntry>> {
        const provider = await this.getWorkspaceStorageProvider(workspaceId);
        return provider.list(filter);
    }

    /**
     * Get devlog from a specific workspace
     */
    async getDevlogFromWorkspace(
        workspaceId: string,
        id: string | number
    ): Promise<DevlogEntry | null> {
        const provider = await this.getWorkspaceStorageProvider(workspaceId);
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        return provider.get(numericId);
    }

    /**
     * Cleanup all storage providers
     */
    async cleanup(): Promise<void> {
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
}
