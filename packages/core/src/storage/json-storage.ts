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
} from '../types/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getDevlogDirFromJsonConfig } from '../utils/storage.js';

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

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    await this.initialize();
    // Load all entries from filesystem
    const entries = await this.loadAllEntries();

    return this.applyFilterAndSort(entries, filter);
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const entries = await this.list();
    const lowerQuery = query.toLowerCase();

    return entries.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.notes.some((note) => note.content.toLowerCase().includes(lowerQuery))
      );
    });
  }

  async getStats(): Promise<DevlogStats> {
    const entries = await this.list();

    const byStatus = {} as Record<DevlogStatus, number>;
    const byType = {} as Record<DevlogType, number>;
    const byPriority = {} as Record<DevlogPriority, number>;

    entries.forEach((entry) => {
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byPriority[entry.priority] = (byPriority[entry.priority] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      byStatus,
      byType,
      byPriority,
    };
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
        return true;
      });
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
}
