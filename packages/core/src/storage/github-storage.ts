/**
 * GitHub Issues Storage Provider - Uses GitHub Issues as primary storage for devlog entries
 */

import {
  StorageProvider,
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  DevlogStats,
  GitHubStorageConfig,
  DevlogStatus,
  DevlogType,
  DevlogPriority,
} from '../types/index.js';
import { GitHubAPIClient, GitHubAPIError, GitHubIssue } from '../utils/github-api.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { LRUCache } from '../utils/lru-cache.js';
import { DevlogGitHubMapper } from '../utils/github-mapper.js';
import { GitHubLabelManager } from '../utils/github-labels.js';

export class GitHubStorageProvider implements StorageProvider {
  private config: Required<GitHubStorageConfig>;
  private apiClient: GitHubAPIClient;
  private rateLimiter: RateLimiter;
  private cache: LRUCache<string, any>;
  private dataMapper: DevlogGitHubMapper;
  private labelManager: GitHubLabelManager;
  private initialized = false;

  constructor(config: GitHubStorageConfig) {
    this.config = this.normalizeConfig(config);
    this.apiClient = new GitHubAPIClient(this.config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.cache = new LRUCache({ max: 100, ttl: this.config.cache.ttl || 300000 });
    this.dataMapper = new DevlogGitHubMapper(this.config);
    this.labelManager = new GitHubLabelManager(this.apiClient, this.config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify API access
    await this.verifyAccess();

    // Initialize required labels
    await this.labelManager.ensureRequiredLabels();

    this.initialized = true;
  }

  async exists(id: DevlogId): Promise<boolean> {
    const issueNumber = id;
    if (isNaN(issueNumber)) return false;

    try {
      await this.rateLimiter.executeWithRateLimit(async () => {
        await this.apiClient.getIssue(issueNumber);
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const cacheKey = `issue-${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const issueNumber = id;
    if (isNaN(issueNumber)) return null;

    try {
      const issue = await this.rateLimiter.executeWithRateLimit(async () => {
        return await this.apiClient.getIssue(issueNumber);
      });

      const devlogEntry = this.dataMapper.issueToDevlog(issue);

      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, devlogEntry);
      }
      return devlogEntry;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async save(entry: DevlogEntry): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const issueData = this.dataMapper.devlogToIssue(entry);

    if (entry.id && (await this.exists(entry.id))) {
      // Update existing issue
      const issueNumber = entry.id;
      await this.rateLimiter.executeWithRateLimit(async () => {
        await this.apiClient.updateIssue(issueNumber, issueData as any);
      });
    } else {
      // Create new issue
      const issue = await this.rateLimiter.executeWithRateLimit(async () => {
        return await this.apiClient.createIssue(issueData as any);
      });
      // Update entry ID to match GitHub issue number
      entry.id = issue.number;
    }

    // Invalidate cache
    this.cache.delete(`issue-${entry.id}`);
  }

  async delete(id: DevlogId): Promise<void> {
    const issueNumber = id;
    if (isNaN(issueNumber)) {
      throw new Error(`Invalid issue number: ${id}`);
    }

    // Close the issue and mark as deleted (GitHub doesn't allow permanent deletion)
    await this.rateLimiter.executeWithRateLimit(async () => {
      await this.apiClient.updateIssue(issueNumber, {
        state: 'closed',
        labels: [`${this.config.labelsPrefix}-deleted`],
      });
    });

    // Invalidate cache
    this.cache.delete(`issue-${id}`);
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    const searchQuery = this.buildSearchQuery(filter);
    console.debug('GitHub storage list query:', searchQuery);

    const issues = await this.rateLimiter.executeWithRateLimit(async () => {
      return await this.apiClient.searchIssues(searchQuery);
    });
    console.debug('GitHub search results:', issues.length, 'issues found');

    // If search returns empty and no specific filters are applied, try listing all issues
    if (issues.length === 0 && (!filter || this.isEmptyFilter(filter))) {
      console.debug('Search returned empty, trying listIssues fallback');
      const allIssues = await this.rateLimiter.executeWithRateLimit(async () => {
        return await this.apiClient.listIssues('all');
      });
      console.debug('listIssues fallback returned:', allIssues.length, 'issues');
      
      // Filter issues that look like devlog entries (have the right structure)
      const devlogIssues = allIssues.filter(issue => this.looksLikeDevlogIssue(issue));
      console.debug('Filtered devlog-like issues:', devlogIssues.length);
      
      return devlogIssues.map((issue) => this.dataMapper.issueToDevlog(issue));
    }

    return issues.map((issue) => this.dataMapper.issueToDevlog(issue));
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const searchQuery = `repo:${this.config.owner}/${this.config.repo} is:issue ${query}`;

    const issues = await this.rateLimiter.executeWithRateLimit(async () => {
      return await this.apiClient.searchIssues(searchQuery);
    });

    return issues.map((issue) => this.dataMapper.issueToDevlog(issue));
  }

  async getStats(): Promise<DevlogStats> {
    // Use GitHub's search API to get counts
    const queries = {
      total: `repo:${this.config.owner}/${this.config.repo} is:issue label:"${this.config.labelsPrefix}-type"`,
      open: `repo:${this.config.owner}/${this.config.repo} is:issue is:open label:"${this.config.labelsPrefix}-type"`,
      inProgress: `repo:${this.config.owner}/${this.config.repo} is:issue label:"${this.config.labelsPrefix}-status:in-progress"`,
      blocked: `repo:${this.config.owner}/${this.config.repo} is:issue label:"${this.config.labelsPrefix}-status:blocked"`,
      inReview: `repo:${this.config.owner}/${this.config.repo} is:issue label:"${this.config.labelsPrefix}-status:in-review"`,
      testing: `repo:${this.config.owner}/${this.config.repo} is:issue label:"${this.config.labelsPrefix}-status:testing"`,
    };

    const [total, open, inProgress, blocked, inReview, testing] = await Promise.all([
      this.rateLimiter.executeWithRateLimit(() => this.apiClient.searchIssuesCount(queries.total)),
      this.rateLimiter.executeWithRateLimit(() => this.apiClient.searchIssuesCount(queries.open)),
      this.rateLimiter.executeWithRateLimit(() =>
        this.apiClient.searchIssuesCount(queries.inProgress),
      ),
      this.rateLimiter.executeWithRateLimit(() =>
        this.apiClient.searchIssuesCount(queries.blocked),
      ),
      this.rateLimiter.executeWithRateLimit(() =>
        this.apiClient.searchIssuesCount(queries.inReview),
      ),
      this.rateLimiter.executeWithRateLimit(() =>
        this.apiClient.searchIssuesCount(queries.testing),
      ),
    ]);

    const done = total - open;

    return {
      totalEntries: total,
      byStatus: {
        new: Math.max(0, open - inProgress - blocked - inReview - testing),
        'in-progress': inProgress,
        blocked: blocked,
        'in-review': inReview,
        testing: testing,
        done: done,
        closed: 0, // We count closed issues as done
      },
      byType: {
        feature: 0, // Could be enhanced to get actual counts
        bugfix: 0,
        task: 0,
        refactor: 0,
        docs: 0,
      },
      byPriority: {
        low: 0, // Could be enhanced to get actual counts
        medium: 0,
        high: 0,
        critical: 0,
      },
    };
  }

  async cleanup(): Promise<void> {
    // Close any remaining API connections
    this.cache.clear();
  }

  async getNextId(): Promise<DevlogId> {
    // For GitHub, the next ID will be determined when creating the issue
    // Return a placeholder that will be replaced on save
    return Date.now(); // Use timestamp as temporary ID
  }

  // Helper methods
  private buildSearchQuery(filter?: DevlogFilter): string {
    let query = `repo:${this.config.owner}/${this.config.repo} is:issue`;

    // Add devlog identifier - use type field or labels depending on configuration
    if (this.config.mapping.useNativeType) {
      // When using native type, we need a different way to identify devlog issues
      // We could use a specific label or rely on the structure
      query += ` label:"${this.config.labelsPrefix}"`;
    } else {
      // Use the traditional type label approach
      if (this.config.mapping.useNativeLabels) {
        // When using native labels, we need to identify devlog issues differently
        query += ` label:"${this.config.labelsPrefix}"`;
      } else {
        query += ` label:"${this.config.labelsPrefix}-type"`;
      }
    }

    if (filter?.status && filter.status.length > 0) {
      const statusQueries = filter.status.map((status) => {
        if (status === 'done') {
          return this.config.mapping.useStateReason ? 'is:closed state:completed' : 'is:closed';
        } else if (status === 'closed') {
          return this.config.mapping.useStateReason ? 'is:closed state:not_planned' : 'is:closed';
        } else if (status === 'new') {
          if (this.config.mapping.useStateReason) {
            return 'is:open';
          } else {
            const labelPrefix = this.config.mapping.useNativeLabels ? 'status:' : `${this.config.labelsPrefix}-status:`;
            return `is:open -label:"${labelPrefix}"`;
          }
        } else {
          if (this.config.mapping.useStateReason) {
            return 'is:open';  // Native state_reason doesn't distinguish these
          } else {
            const labelPrefix = this.config.mapping.useNativeLabels ? 'status:' : `${this.config.labelsPrefix}-status:`;
            return `label:"${labelPrefix}${status}"`;
          }
        }
      });
      query += ` (${statusQueries.join(' OR ')})`;
    }

    if (filter?.type && filter.type.length > 0) {
      if (this.config.mapping.useNativeType) {
        // Use GitHub's native type field
        const typeQueries = filter.type.map((type) => {
          const githubType = this.mapDevlogTypeToGitHubType(type);
          return `type:"${githubType}"`;
        });
        query += ` (${typeQueries.join(' OR ')})`;
      } else {
        // Use labels
        const typeQueries = filter.type.map((type) => {
          if (this.config.mapping.useNativeLabels) {
            const githubLabel = this.mapDevlogTypeToGitHubLabel(type);
            return `label:"${githubLabel}"`;
          } else {
            return `label:"${this.config.labelsPrefix}-type:${type}"`;
          }
        });
        query += ` (${typeQueries.join(' OR ')})`;
      }
    }

    if (filter?.priority && filter.priority.length > 0) {
      const priorityQueries = filter.priority.map((priority) => {
        const labelPrefix = this.config.mapping.useNativeLabels ? 'priority:' : `${this.config.labelsPrefix}-priority:`;
        return `label:"${labelPrefix}${priority}"`;
      });
      query += ` (${priorityQueries.join(' OR ')})`;
    }

    if (filter?.assignee) {
      query += ` assignee:${filter.assignee}`;
    }

    if (filter?.fromDate) {
      query += ` created:>=${filter.fromDate}`;
    }

    if (filter?.toDate) {
      query += ` created:<=${filter.toDate}`;
    }

    return query;
  }

  private mapDevlogTypeToGitHubType(devlogType: string): string {
    switch (devlogType) {
      case 'bugfix': return 'bug';
      case 'feature': return 'enhancement';
      case 'docs': return 'documentation';
      case 'refactor': return 'refactor';
      case 'task': return 'task';
      default: return devlogType;
    }
  }

  private mapDevlogTypeToGitHubLabel(devlogType: string): string {
    switch (devlogType) {
      case 'bugfix': return 'bug';
      case 'feature': return 'enhancement';
      case 'docs': return 'documentation';
      case 'refactor': return 'refactor';
      case 'task': return 'task';
      default: return devlogType;
    }
  }

  private isEmptyFilter(filter: DevlogFilter): boolean {
    return !filter.status?.length &&
           !filter.type?.length &&
           !filter.priority?.length &&
           !filter.assignee &&
           !filter.fromDate &&
           !filter.toDate;
  }

  private looksLikeDevlogIssue(issue: GitHubIssue): boolean {
    // Check if issue has devlog-related labels or structure
    const hasDevlogLabels = issue.labels.some((label: any) => 
      label.name.startsWith(this.config.labelsPrefix)
    );
    
    // Check if title/body suggests it's a devlog entry
    const hasDevlogStructure = issue.title.toLowerCase().includes('devlog') ||
                               (issue.body?.toLowerCase().includes('devlog') ?? false) ||
                               (issue.body?.includes('## Business Context') ?? false) ||
                               (issue.body?.includes('## Technical Context') ?? false);
    
    return hasDevlogLabels || hasDevlogStructure;
  }

  private normalizeConfig(config: GitHubStorageConfig): Required<GitHubStorageConfig> {
    return {
      ...config,
      apiUrl: config.apiUrl || 'https://api.github.com',
      branch: config.branch || 'main',
      labelsPrefix: config.labelsPrefix || 'devlog',
      mapping: {
        useNativeType: true,
        useNativeLabels: true,
        useStateReason: true,
        ...config.mapping,
      },
      rateLimit: {
        requestsPerHour: 5000,
        retryDelay: 1000,
        maxRetries: 3,
        ...config.rateLimit,
      },
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        ...config.cache,
      },
    };
  }

  private async verifyAccess(): Promise<void> {
    try {
      // Test repository access
      await this.rateLimiter.executeWithRateLimit(async () => {
        await this.apiClient.getRepository();
      });
    } catch (error: any) {
      throw new Error(
        `GitHub API access verification failed: ${error.message}. ` +
          `Please check your token permissions and repository access.`,
      );
    }
  }
}
