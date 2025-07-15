import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GitHubStorageProvider } from '../storage/github-storage.js';
import { GitHubStorageConfig, DevlogEntry } from '@devlog/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHubStorageProvider', () => {
  let provider: GitHubStorageProvider;
  let mockConfig: GitHubStorageConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      owner: 'testorg',
      repo: 'testrepo',
      token: 'test-token',
      labelsPrefix: 'devlog',
    };

    provider = new GitHubStorageProvider(mockConfig);
  });

  describe('initialization', () => {
    it('should normalize config with defaults', () => {
      expect(provider['config'].apiUrl).toBe('https://api.github.com');
      expect(provider['config'].branch).toBe('main');
      expect(provider['config'].labelsPrefix).toBe('devlog');
      expect(provider['config'].rateLimit.requestsPerHour).toBe(5000);
      expect(provider['config'].cache.enabled).toBe(true);
    });
  });

  describe('buildSearchQuery', () => {
    it('should build basic search query', () => {
      const query = provider['buildSearchQuery']();
      expect(query).toBe('repo:testorg/testrepo is:issue label:"devlog"');
    });

    it('should build query with status filter', () => {
      const query = provider['buildSearchQuery']({ status: ['in-progress', 'done'] });
      expect(query).toContain('(is:open OR is:closed state:completed)');
    });

    it('should build query with type filter', () => {
      const query = provider['buildSearchQuery']({ type: ['feature', 'bugfix'] });
      expect(query).toContain('(type:"enhancement" OR type:"bug")');
    });

    it('should build query with assignee filter', () => {
      const query = provider['buildSearchQuery']({ assignee: 'testuser' });
      expect(query).toContain('assignee:testuser');
    });

    it('should build query with date filters', () => {
      const query = provider['buildSearchQuery']({ 
        fromDate: '2025-01-01',
        toDate: '2025-12-31'
      });
      expect(query).toContain('created:>=2025-01-01');
      expect(query).toContain('created:<=2025-12-31');
    });
  });

  describe('getNextId', () => {
    it('should return a timestamp as next ID', async () => {
      const nextId = await provider.getNextId();
      expect(typeof nextId).toBe('number');
      expect(nextId).toBeGreaterThan(0);
    });
  });

  describe('data conversion', () => {
    it('should handle devlog entry without optional fields', () => {
      const entry: DevlogEntry = {
        id: 1,
        key: 'test-feature',
        title: 'Test Feature',
        type: 'feature',
        description: 'A test feature',
        status: 'new',
        priority: 'medium',
        createdAt: '2025-07-10T10:00:00Z',
        updatedAt: '2025-07-10T10:00:00Z',
        notes: [],
        files: [],
        relatedDevlogs: [],
        context: {
          businessContext: '',
          technicalContext: '',
          dependencies: [],
          decisions: [],
          acceptanceCriteria: [],
          risks: [],
        },
        aiContext: {
          currentSummary: '',
          keyInsights: [],
          openQuestions: [],
          relatedPatterns: [],
          suggestedNextSteps: [],
          lastAIUpdate: '2025-07-10T10:00:00Z',
          contextVersion: 1,
        },
      };

      const issueData = provider['dataMapper'].devlogToIssue(entry);
      expect(issueData.title).toBe('Test Feature');
      expect(issueData.labels).toContain('enhancement');
      // Priority labels are not added when useNativeType is true
      expect(issueData.type).toBe('feature'); // Native type field is used instead
    });
  });

  describe('error handling', () => {
    it('should handle invalid issue numbers', async () => {
      expect(await provider.exists(NaN)).toBe(false);
      expect(await provider.get(NaN)).toBe(null);
    });

    it('should throw error for invalid delete ID', async () => {
      await expect(provider.delete(NaN)).rejects.toThrow('Invalid issue number');
    });
  });

  describe('normalizeConfig', () => {
    it('should handle custom configuration', () => {
      const customConfig: GitHubStorageConfig = {
        owner: 'custom',
        repo: 'custom',
        token: 'token',
        apiUrl: 'https://api.github.enterprise.com',
        labelsPrefix: 'custom',
        rateLimit: {
          requestsPerHour: 1000,
          retryDelay: 2000,
          maxRetries: 5,
        },
        cache: {
          enabled: false,
          ttl: 60000,
        },
      };

      const customProvider = new GitHubStorageProvider(customConfig);
      const normalizedConfig = customProvider['config'];

      expect(normalizedConfig.apiUrl).toBe('https://api.github.enterprise.com');
      expect(normalizedConfig.labelsPrefix).toBe('custom');
      expect(normalizedConfig.rateLimit.requestsPerHour).toBe(1000);
      expect(normalizedConfig.cache.enabled).toBe(false);
    });
  });
});
