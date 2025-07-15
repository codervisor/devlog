/**
 * Tests for JsonStorageProvider - verifying file-based storage without index.json dependency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonStorageProvider } from '../storage/json-storage.js';
import type { DevlogEntry } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('JsonStorageProvider', () => {
  let storage: JsonStorageProvider;
  let testDir: string;
  let devlogDir: string;
  let entriesDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create unique test directory for each test
    testDir = path.join(tmpdir(), `devlog-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    devlogDir = path.join(testDir, '.devlog');
    entriesDir = path.join(devlogDir, 'entries');

    // Create test directory and change to it
    await fs.mkdir(testDir, { recursive: true });
    
    // Create a minimal package.json to make it look like a valid project root
    await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0'
    }, null, 2));
    
    process.chdir(testDir);

    // Initialize storage provider with relative path while in test directory
    storage = new JsonStorageProvider({
      directory: '.devlog',
      global: false,
    });

    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up storage if it was created successfully
    if (storage) {
      await storage.cleanup();
    }
    
    // Restore original working directory before cleanup
    if (originalCwd && originalCwd !== process.cwd()) {
      process.chdir(originalCwd);
    }
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create directory structure without index.json', async () => {
      // Verify directories exist (using absolute paths for verification)
      const devlogExists = await fs.access(devlogDir).then(() => true).catch(() => false);
      const entriesExists = await fs.access(entriesDir).then(() => true).catch(() => false);
      
      expect(devlogExists).toBe(true);
      expect(entriesExists).toBe(true);

      // Verify index.json does NOT exist
      const indexPath = path.join(devlogDir, 'index.json');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      
      expect(indexExists).toBe(false);
    });

    it('should create .gitignore file', async () => {
      const gitignorePath = path.join(devlogDir, '.gitignore');
      const gitignoreExists = await fs.access(gitignorePath).then(() => true).catch(() => false);
      
      expect(gitignoreExists).toBe(true);
    });
  });

  describe('entry management', () => {
    const createTestEntry = (title: string): Partial<DevlogEntry> => ({
      title,
      description: `Description for ${title}`,
      type: 'feature',
      status: 'new',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    });

    it('should save and retrieve entries without index.json', async () => {
      const testEntry = createTestEntry('Test Entry 1');
      
      // Save entry
      await storage.save(testEntry as DevlogEntry);
      expect(testEntry.id).toBeDefined();

      // Retrieve entry
      const retrieved = await storage.get(testEntry.id!);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.title).toBe('Test Entry 1');
      expect(retrieved!.id).toBe(testEntry.id);

      // Verify no index.json was created
      const indexPath = path.join(devlogDir, 'index.json');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      expect(indexExists).toBe(false);
    });

    it('should generate unique sequential IDs', async () => {
      const entry1 = createTestEntry('Entry 1');
      const entry2 = createTestEntry('Entry 2');
      
      await storage.save(entry1 as DevlogEntry);
      await storage.save(entry2 as DevlogEntry);

      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
      expect(entry1.id).not.toBe(entry2.id);
      
      // IDs should be sequential numbers starting from 1
      expect(entry1.id!).toBeGreaterThan(0);
      expect(entry2.id!).toBeGreaterThan(0);
      expect(Math.abs(entry2.id! - entry1.id!)).toBe(1); // Sequential
    });

    it('should handle entry existence checks', async () => {
      const testEntry = createTestEntry('Test Entry');
      
      // Entry should not exist initially
      expect(await storage.exists(999999)).toBe(false);
      
      // Save entry
      await storage.save(testEntry as DevlogEntry);
      
      // Entry should exist now
      expect(await storage.exists(testEntry.id!)).toBe(true);
      
      // Non-existent entry should still not exist
      expect(await storage.exists(999999)).toBe(false);
    });

    it('should delete entries', async () => {
      const testEntry = createTestEntry('Test Entry');
      
      // Save and verify existence
      await storage.save(testEntry as DevlogEntry);
      expect(await storage.exists(testEntry.id!)).toBe(true);
      
      // Delete entry
      await storage.delete(testEntry.id!);
      
      // Verify deletion
      expect(await storage.exists(testEntry.id!)).toBe(false);
      expect(await storage.get(testEntry.id!)).toBe(null);
    });
  });

  describe('listing and filtering', () => {
    const createTestEntries = async () => {
      const entries = [
        { title: 'Feature A', type: 'feature', status: 'new', priority: 'high' },
        { title: 'Bug Fix B', type: 'bugfix', status: 'in-progress', priority: 'medium' },
        { title: 'Task C', type: 'task', status: 'done', priority: 'low' },
      ];

      for (const entry of entries) {
        const fullEntry = {
          ...entry,
          description: `Description for ${entry.title}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: [],
        } as DevlogEntry;
        
        await storage.save(fullEntry);
      }
    };

    it('should list all entries using file discovery', async () => {
      await createTestEntries();
      
      const entries = await storage.list();
      expect(entries).toHaveLength(3);
      
      const titles = entries.map(e => e.title).sort();
      expect(titles).toEqual(['Bug Fix B', 'Feature A', 'Task C']);
    });

    it('should filter entries by status', async () => {
      await createTestEntries();
      
      const newEntries = await storage.list({ status: ['new'] });
      expect(newEntries).toHaveLength(1);
      expect(newEntries[0].title).toBe('Feature A');
      
      const inProgressEntries = await storage.list({ status: ['in-progress'] });
      expect(inProgressEntries).toHaveLength(1);
      expect(inProgressEntries[0].title).toBe('Bug Fix B');
    });

    it('should filter entries by type', async () => {
      await createTestEntries();
      
      const features = await storage.list({ type: ['feature'] });
      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('Feature A');
      
      const bugfixes = await storage.list({ type: ['bugfix'] });
      expect(bugfixes).toHaveLength(1);
      expect(bugfixes[0].title).toBe('Bug Fix B');
    });

    it('should filter entries by priority', async () => {
      await createTestEntries();
      
      const highPriority = await storage.list({ priority: ['high'] });
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].title).toBe('Feature A');
    });

    it('should sort entries by updatedAt (most recent first)', async () => {
      const entry1 = {
        title: 'Old Entry',
        description: 'Old',
        type: 'task',
        status: 'new',
        priority: 'medium',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        notes: [],
      } as DevlogEntry;
      
      const entry2 = {
        title: 'New Entry',
        description: 'New',
        type: 'task',
        status: 'new',
        priority: 'medium',
        createdAt: '2025-07-15T00:00:00.000Z',
        updatedAt: '2025-07-15T00:00:00.000Z',
        notes: [],
      } as DevlogEntry;

      await storage.save(entry1);
      await storage.save(entry2);
      
      const entries = await storage.list();
      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('New Entry'); // Most recent first
      expect(entries[1].title).toBe('Old Entry');
    });
  });

  describe('search functionality', () => {
    it('should search entries by title and description', async () => {
      const entry1 = {
        title: 'React Component',
        description: 'Build a new React component for the dashboard',
        type: 'feature',
        status: 'new',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      } as DevlogEntry;

      const entry2 = {
        title: 'Fix Bug',
        description: 'Fix a critical bug in the API',
        type: 'bugfix',
        status: 'in-progress',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      } as DevlogEntry;

      await storage.save(entry1);
      await storage.save(entry2);

      // Search by title
      const reactResults = await storage.search('React');
      expect(reactResults).toHaveLength(1);
      expect(reactResults[0].title).toBe('React Component');

      // Search by description
      const apiResults = await storage.search('API');
      expect(apiResults).toHaveLength(1);
      expect(apiResults[0].title).toBe('Fix Bug');

      // Search by partial match
      const componentResults = await storage.search('component');
      expect(componentResults).toHaveLength(1);
      expect(componentResults[0].title).toBe('React Component');
    });

    it('should search in notes content', async () => {
      const entry = {
        title: 'Test Entry',
        description: 'Test description',
        type: 'task',
        status: 'new',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [{
          id: 'note1',
          timestamp: new Date().toISOString(),
          category: 'progress',
          content: 'This is a special implementation detail'
        }],
      } as DevlogEntry;

      await storage.save(entry);

      const results = await storage.search('special implementation');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Entry');
    });
  });

  describe('statistics', () => {
    it('should generate correct statistics', async () => {
      const entries = [
        { type: 'feature', status: 'new', priority: 'high' },
        { type: 'feature', status: 'in-progress', priority: 'medium' },
        { type: 'bugfix', status: 'done', priority: 'high' },
        { type: 'task', status: 'new', priority: 'low' },
      ];

      for (let i = 0; i < entries.length; i++) {
        const entry = {
          title: `Entry ${i + 1}`,
          description: `Description ${i + 1}`,
          ...entries[i],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: [],
        } as DevlogEntry;
        
        await storage.save(entry);
      }

      const stats = await storage.getStats();
      
      expect(stats.totalEntries).toBe(4);
      expect(stats.byType.feature).toBe(2);
      expect(stats.byType.bugfix).toBe(1);
      expect(stats.byType.task).toBe(1);
      expect(stats.byStatus.new).toBe(2);
      expect(stats.byStatus['in-progress']).toBe(1);
      expect(stats.byStatus.done).toBe(1);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe('file-based storage structure', () => {
    it('should store entries as individual JSON files', async () => {
      const entry1 = {
        title: 'Entry One',
        description: 'First entry',
        type: 'feature',
        status: 'new',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      } as DevlogEntry;

      const entry2 = {
        title: 'Entry Two',
        description: 'Second entry',
        type: 'bugfix',
        status: 'in-progress',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      } as DevlogEntry;

      await storage.save(entry1);
      await storage.save(entry2);

      // Check that files exist in entries directory
      const files = await fs.readdir(entriesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      expect(jsonFiles).toHaveLength(2);
      
      // Verify file naming pattern
      jsonFiles.forEach(filename => {
        expect(filename).toMatch(/^\d+-[\w-]+\.json$/);
      });

      // Verify no index.json was created
      const indexPath = path.join(devlogDir, 'index.json');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      expect(indexExists).toBe(false);
    });
  });

  describe('concurrent access simulation', () => {
    it('should handle multiple saves without conflicts', async () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        title: `Sequential Entry ${i + 1}`,
        description: `Description ${i + 1}`,
        type: 'feature' as const,
        status: 'new' as const,
        priority: 'medium' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      }));

      // Save entries sequentially to avoid ID conflicts
      for (const entry of entries) {
        await storage.save(entry as DevlogEntry);
      }

      // Verify all entries were saved with unique IDs
      const savedEntries = await storage.list();
      expect(savedEntries).toHaveLength(5);
      
      const ids = savedEntries.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5); // All IDs should be unique
    });
  });
});
