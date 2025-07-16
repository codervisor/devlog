/**
 * File-based JSON storage provider - stores devlog entries as JSON files without index.json dependency
 * Uses direct file discovery for resilient multi-agent access patterns
 */

import type {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogPriority,
  DevlogStats,
  DevlogStatus,
  DevlogType,
  JsonConfig,
  StorageProvider,
  ChatSession,
  ChatMessage,
  ChatFilter,
  ChatStats,
  ChatSessionId,
  ChatMessageId,
  ChatSearchResult,
  ChatDevlogLink,
  ChatWorkspace,
  PaginatedResult,
  PaginationOptions,
} from '../types/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getDevlogDirFromJsonConfig, calculateDevlogStats } from '../utils/storage.js';

export class JsonStorageProvider implements StorageProvider {
  private readonly config: Required<JsonConfig>;
  private readonly devlogDir: string;
  private readonly entriesDir: string;
  private initialized = false;

  constructor(config: JsonConfig = {}) {
    this.config = {
      directory: config.directory || '.devlog',
      filePattern: config.filePattern || '{id:auto}-{slug}.json',
      minPadding: config.minPadding || 3,
      global: config.global !== undefined ? config.global : true,
    };

    this.devlogDir = getDevlogDirFromJsonConfig(this.config);
    this.entriesDir = path.join(this.devlogDir, 'entries');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create .devlog directory structure
    await fs.mkdir(this.devlogDir, { recursive: true });
    await fs.mkdir(this.entriesDir, { recursive: true });

    // Create .gitignore if needed (to exclude cache files but include JSON files)
    await this.ensureGitignore();

    this.initialized = true;
  }

  async exists(id: DevlogId): Promise<boolean> {
    const filename = await this.findFileById(id);
    return filename !== null;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const filename = await this.findFileById(id);
    if (!filename) return null;

    try {
      const filePath = path.join(this.entriesDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(content) as DevlogEntry;
      return entry;
    } catch {
      return null;
    }
  }

  async save(entry: DevlogEntry): Promise<void> {
    await this.initialize();

    // New entry if it doesn't have an ID
    if (!entry.id) {
      entry.id = await this.getNextId();
    }

    const slug = this.createSlug(entry.title);
    const filename = this.generateFilename(entry.id, slug);
    const filePath = path.join(this.entriesDir, filename);

    // Save entry file
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }

  async delete(id: DevlogId): Promise<void> {
    const filename = await this.findFileById(id);
    if (filename) {
      const filePath = path.join(this.entriesDir, filename);
      try {
        await fs.unlink(filePath);
      } catch {
        // File might not exist, continue
      }
    }
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[] | PaginatedResult<DevlogEntry>> {
    await this.initialize();
    // Load all entries from filesystem
    const entries = await this.loadAllEntries();

    const filteredEntries = this.applyFilterAndSort(entries, filter);
    
    // If pagination is requested, return paginated result
    if (filter?.pagination) {
      return this.paginateResults(filteredEntries, filter.pagination);
    }
    
    return filteredEntries;
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const result = await this.list();
    const entries = Array.isArray(result) ? result : result.items;
    const lowerQuery = query.toLowerCase();

    return entries.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.notes.some((note) => note.content.toLowerCase().includes(lowerQuery))
      );
    });
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    const result = await this.list(filter);
    const entries = Array.isArray(result) ? result : result.items;
    return calculateDevlogStats(entries);
  }

  async cleanup(): Promise<void> {
    // No cleanup needed without cache
  }

  /**
   * Get the next available ID for a new entry
   * Uses simple incremental numbering: 1, 2, 3, 4, ...
   * 
   * Note: For multi-agent parallel access patterns, consider using
   * more advanced storage providers that handle concurrent access better.
   */
  async getNextId(): Promise<DevlogId> {
    // Get all existing entries to find the highest ID
    const entries = await this.loadAllEntries();
    
    if (entries.length === 0) {
      return 1;
    }
    
    // Find the highest existing ID and return the next one
    const maxId = Math.max(...entries.map(entry => entry.id || 0));
    return maxId + 1;
  }

  private async loadAllEntries(): Promise<DevlogEntry[]> {
    try {
      const files = await fs.readdir(this.entriesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const entries: DevlogEntry[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.entriesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry = JSON.parse(content) as DevlogEntry;
          entries.push(entry);
        } catch {
          // Skip invalid files
          continue;
        }
      }
      
      return entries;
    } catch {
      return [];
    }
  }

  private async findFileById(id: DevlogId): Promise<string | null> {
    try {
      const files = await fs.readdir(this.entriesDir);
      
      // Look for files that start with the ID (supports various padding formats)
      for (const file of files) {
        if (file.endsWith('.json')) {
          // Extract ID from filename (assumes format: {id}-{slug}.json)
          const match = file.match(/^(\d+)-/);
          if (match && parseInt(match[1]) === id) {
            return file;
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private applyFilterAndSort(entries: DevlogEntry[], filter?: DevlogFilter): DevlogEntry[] {
    let filtered = entries;

    if (filter) {
      filtered = entries.filter((entry) => {
        if (filter.status && !filter.status.includes(entry.status)) return false;
        if (filter.type && !filter.type.includes(entry.type)) return false;
        if (filter.priority && !filter.priority.includes(entry.priority)) return false;
        if (filter.assignee && entry.assignee !== filter.assignee) return false;
        if (filter.fromDate && entry.createdAt < filter.fromDate) return false;
        if (filter.toDate && entry.createdAt > filter.toDate) return false;
        
        // Filter by archived status (default to non-archived if not specified)
        if (filter.archived !== undefined) {
          const isArchived = entry.archived === true;
          if (filter.archived !== isArchived) return false;
        } else {
          // Default behavior: exclude archived entries unless explicitly requested
          if (entry.archived === true) return false;
        }
        
        return true;
      });
    } else {
      // Even without filter, exclude archived entries by default
      filtered = entries.filter((entry) => entry.archived !== true);
    }

    // Sort by updated time (most recent first)
    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private async ensureGitignore(): Promise<void> {
    const gitignorePath = path.join(this.devlogDir, '.gitignore');
    const gitignoreContent = `# Devlog - exclude cache and temporary files, include JSON entries
*.tmp
*.cache
cache/
temp/

# Include JSON files and structure
!entries/
!*.json
`;

    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  private generateFilename(id: number, slug: string): string {
    // Use a simple format with consistent padding
    const paddedId = id.toString().padStart(this.config.minPadding, '0');
    return this.config.filePattern.replace('{id:auto}', paddedId).replace('{slug}', slug);
  }

  // ===== Chat Storage Operations (Stub implementations for JSON storage) =====
  // Note: JSON storage is not recommended for chat data due to size concerns

  async saveChatSession(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async getChatSession(): Promise<null> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async listChatSessions(): Promise<[]> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async deleteChatSession(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async saveChatMessages(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async getChatMessages(): Promise<[]> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async searchChatContent(): Promise<[]> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async getChatStats(): Promise<any> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error('Chat storage is not supported in JSON provider due to size concerns. Use SQLite or database provider.');
  }

  /**
   * Apply pagination to a list of entries
   * @private
   */
  private paginateResults(entries: DevlogEntry[], pagination: PaginationOptions): PaginatedResult<DevlogEntry> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = pagination.offset || (page - 1) * limit;
    
    // Apply sorting if specified
    if (pagination.sortBy) {
      entries = this.sortEntries(entries, pagination.sortBy, pagination.sortOrder || 'desc');
    }
    
    const total = entries.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedItems = entries.slice(offset, offset + limit);
    
    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Sort entries by specified field
   * @private
   */
  private sortEntries(entries: DevlogEntry[], sortBy: string, sortOrder: 'asc' | 'desc'): DevlogEntry[] {
    return [...entries].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'createdAt':
        case 'updatedAt':
          aVal = new Date(a[sortBy]).getTime();
          bVal = new Date(b[sortBy]).getTime();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = { new: 1, 'in-progress': 2, blocked: 3, 'in-review': 4, testing: 5, done: 6, cancelled: 7 };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        default:
          aVal = a[sortBy as keyof DevlogEntry];
          bVal = b[sortBy as keyof DevlogEntry];
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
