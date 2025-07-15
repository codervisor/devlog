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
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { getDevlogDirFromJsonConfig } from '../utils/storage.js';

export class JsonStorageProvider implements StorageProvider {
  private readonly config: Required<JsonConfig>;
  private readonly devlogDir: string;
  private readonly entriesDir: string;
  private initialized = false;
  
  // Simple in-memory cache to improve performance for repeated operations
  private cache = new Map<string, DevlogEntry>();
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 10000; // 10 seconds

  // Project epoch for Julian day calculation (first commit date)
  private readonly PROJECT_EPOCH = new Date('2025-06-20T00:00:00Z');

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
    const cacheKey = id.toString();
    
    // Check cache first
    if (this.isCacheValid() && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    const filename = await this.findFileById(id);
    if (!filename) return null;

    try {
      const filePath = path.join(this.entriesDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(content) as DevlogEntry;
      
      // Cache the result
      this.cache.set(cacheKey, entry);
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

    // Update cache
    this.cache.set(entry.id.toString(), entry);
    this.cacheTimestamp = Date.now();
  }

  async delete(id: DevlogId): Promise<void> {
    const filename = await this.findFileById(id);
    if (filename) {
      const filePath = path.join(this.entriesDir, filename);
      try {
        await fs.unlink(filePath);
        // Remove from cache
        this.cache.delete(id.toString());
      } catch {
        // File might not exist, continue
      }
    }
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    await this.initialize();
    
    // Use cached entries if available and fresh
    if (this.isCacheValid() && this.cache.size > 0) {
      const entries = Array.from(this.cache.values());
      return this.applyFilterAndSort(entries, filter);
    }

    // Load all entries from filesystem
    const entries = await this.loadAllEntries();
    
    // Cache all entries
    this.cache.clear();
    entries.forEach(entry => {
      this.cache.set(entry.id!.toString(), entry);
    });
    this.cacheTimestamp = Date.now();

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
    // Clear cache
    this.cache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Get the next available ID for a new entry
   * Uses multi-dimensional ID structure: {agent}{julianDay}{sequence}
   * This creates shorter, more readable IDs while maintaining multi-agent safety
   */
  async getNextId(): Promise<DevlogId> {
    try {
      const agentHash = this.getAgentHash();
      const julianDay = this.getProjectJulianDay();
      const sequence = await this.getNextSequence(agentHash, julianDay);
      
      const seqStr = sequence.toString().padStart(3, '0');
      const id = parseInt(`${agentHash}${julianDay}${seqStr}`);
      
      return id;
    } catch (error) {
      // Fallback to timestamp-based ID for edge cases
      console.warn('Failed to generate multi-dimensional ID, falling back to timestamp:', error);
      return this.getTimestampBasedId();
    }
  }

  /**
   * Generate agent hash from git user.email or user@hostname fallback
   * Creates a stable 3-digit identifier for each agent (0-999)
   */
  private getAgentHash(): number {
    try {
      // Primary: Git user.email (most stable across environments)
      const gitEmail = execSync('git config user.email', { 
        encoding: 'utf8', 
        stdio: ['ignore', 'pipe', 'ignore'] 
      }).trim();
      
      if (gitEmail) {
        return this.hashToAgentId(gitEmail);
      }
    } catch {
      // Git not available or not configured, use fallback
    }
    
    // Fallback: user@hostname
    const fallback = `${os.userInfo().username}@${os.hostname()}`;
    return this.hashToAgentId(fallback);
  }

  /**
   * Convert string identifier to stable 3-digit agent ID (0-999)
   */
  private hashToAgentId(identifier: string): number {
    const hash = crypto.createHash('sha256')
      .update(identifier)
      .digest('hex')
      .slice(0, 8); // First 8 hex chars for good distribution
    
    return parseInt(hash, 16) % 1000; // 0-999 range
  }

  /**
   * Calculate Julian day number relative to project start (2025-06-20)
   * Returns days since project epoch, starting from 1
   */
  private getProjectJulianDay(date = new Date()): number {
    const diffTime = date.getTime() - this.PROJECT_EPOCH.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Get next sequence number for this agent on this day
   * Searches existing files to find the next available sequence
   */
  private async getNextSequence(agentHash: number, julianDay: number): Promise<number> {
    let sequence = 1;
    const maxSequence = 999; // Maximum sequences per agent per day
    
    while (sequence <= maxSequence) {
      const seqStr = sequence.toString().padStart(3, '0');
      const testId = parseInt(`${agentHash}${julianDay}${seqStr}`);
      
      const filename = await this.findFileById(testId);
      if (!filename) {
        // This sequence number is available
        return sequence;
      }
      
      sequence++;
    }
    
    // All sequences exhausted for this agent/day (very unlikely)
    throw new Error(`All sequences exhausted for agent ${agentHash} on day ${julianDay}`);
  }

  /**
   * Fallback timestamp-based ID generation for edge cases
   * Uses shorter timestamps with 2024 epoch for reduced length
   */
  private getTimestampBasedId(): DevlogId {
    const epoch2024 = new Date('2024-01-01T00:00:00Z').getTime();
    const relativeMs = Date.now() - epoch2024;
    const random = Math.floor(Math.random() * 1000);
    
    // This creates IDs around 11-12 digits instead of 16
    return parseInt(`${relativeMs}${random.toString().padStart(3, '0')}`);
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
      const idStr = id.toString();
      
      // Look for files that start with the ID (supports various padding formats)
      for (const file of files) {
        if (file.endsWith('.json')) {
          // Extract ID from filename (assumes format: {id}-{slug}.json)
          const match = file.match(/^(\d+)-/);
          if (match && match[1] === idStr) {
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

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
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
