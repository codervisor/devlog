/**
 * GitHub Issues Storage Provider - Uses GitHub Issues as primary storage for devlog entries
 */

import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogStats,
  GitHubStorageConfig,
  NoteCategory,
  PaginatedResult,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../../types/index.js';
import { calculateDevlogStats, calculateTimeSeriesStats } from '../shared/index.js';
import {
  DevlogGitHubMapper,
  formatGitHubComment,
  GitHubAPIClient,
  GitHubComment,
  GitHubIssue,
  GitHubLabelManager,
  LRUCache,
  mapDevlogTypeToGitHubLabel,
  mapDevlogTypeToGitHubType,
  RateLimiter,
} from '../github/index.js';
import { createPaginatedResult } from '../../utils/common.js';

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

      // Fetch and sync GitHub comments as DevlogNotes
      const comments = await this.rateLimiter.executeWithRateLimit(async () => {
        return await this.apiClient.getIssueComments(issueNumber);
      });

      devlogEntry.notes = this.commentsToNotes(comments);

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

      // Filter out invalid fields for GitHub API - only include UpdateIssueRequest fields
      const updateData: any = {
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels,
      };

      // Add state fields only if this is an UpdateIssueRequest
      if ('state' in issueData) {
        updateData.state = issueData.state;
      }
      if ('state_reason' in issueData) {
        updateData.state_reason = issueData.state_reason;
      }

      await this.rateLimiter.executeWithRateLimit(async () => {
        await this.apiClient.updateIssue(issueNumber, updateData);
      });

      // Sync notes with GitHub comments
      if (entry.notes && entry.notes.length > 0) {
        await this.syncNotesWithComments(issueNumber, entry.notes);
      }
    } else {
      // Create new issue

      // Filter out invalid fields for GitHub API - only include CreateIssueRequest fields
      const createData: any = {
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels,
      };

      // Ensure required fields are present
      if (!createData.title) {
        throw new Error('Issue title is required');
      }

      const issue = await this.rateLimiter.executeWithRateLimit(async () => {
        return await this.apiClient.createIssue(createData);
      });
      // Update entry ID to match GitHub issue number
      entry.id = issue.number;

      // Sync notes with GitHub comments
      if (entry.notes && entry.notes.length > 0) {
        await this.syncNotesWithComments(issue.number, entry.notes);
      }
    }

    // Invalidate cache
    this.cache.delete(`issue-${entry.id}`);
  }

  /**
   * Delete a devlog entry (GitHub implementation uses issue closing)
   * Note: GitHub storage doesn't support hard deletion, so this closes the issue
   * and removes labels to indicate deletion. This is already a soft delete pattern.
   */
  async delete(id: DevlogId): Promise<void> {
    const issueNumber = id;
    if (isNaN(issueNumber)) {
      throw new Error(`Invalid issue number: ${id}`);
    }

    // Close the issue and remove marker label to indicate deletion
    const markerLabel = this.config.markerLabel || 'devlog';
    await this.rateLimiter.executeWithRateLimit(async () => {
      await this.apiClient.updateIssue(issueNumber, {
        state: 'closed',
        state_reason: 'not_planned',
        labels: [], // Remove all labels to indicate deletion
      });
    });

    // Invalidate cache
    this.cache.delete(`issue-${id}`);
  }

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
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
      const devlogIssues = allIssues.filter((issue) => this.looksLikeDevlogIssue(issue));
      console.debug('Filtered devlog-like issues:', devlogIssues.length);

      const entries = devlogIssues.map((issue) => this.dataMapper.issueToDevlog(issue));
      return createPaginatedResult(entries, filter?.pagination || { page: 1, limit: 100 });
    }

    const entries = issues.map((issue) => this.dataMapper.issueToDevlog(issue));
    return createPaginatedResult(entries, filter?.pagination || { page: 1, limit: 100 });
  }

  async search(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    // Build search query with GitHub-specific syntax and filters
    let searchQuery = `repo:${this.config.owner}/${this.config.repo} is:issue ${query}`;

    // Add filter-based constraints to GitHub search
    if (filter?.status && filter.status.length > 0) {
      // Map DevlogStatus to GitHub issue states
      const hasOpen = filter.status.some((s) =>
        ['new', 'in-progress', 'blocked', 'in-review', 'testing'].includes(s),
      );
      const hasClosed = filter.status.some((s) => ['done', 'cancelled'].includes(s));

      if (hasOpen && !hasClosed) {
        searchQuery += ' state:open';
      } else if (hasClosed && !hasOpen) {
        searchQuery += ' state:closed';
      }
    }

    // For archived filtering in GitHub: closed issues with specific reason could be considered archived
    // GitHub storage uses issue closing as soft delete, so we respect the archived filter differently
    if (filter?.archived === false) {
      // Only include issues that are not marked as "not planned" (our deletion marker)
      searchQuery += ' -reason:not_planned';
    } else if (filter?.archived === true) {
      // Only include issues marked as "not planned" (archived/deleted)
      searchQuery += ' reason:not_planned';
    }

    const issues = await this.rateLimiter.executeWithRateLimit(async () => {
      return await this.apiClient.searchIssues(searchQuery);
    });

    const entries = issues.map((issue) => this.dataMapper.issueToDevlog(issue));

    // Apply pagination if specified in filter
    const pagination = filter?.pagination || { page: 1, limit: 100 };
    return createPaginatedResult(entries, pagination);
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    // Get ALL entries for accurate statistics, not paginated results
    const result = await this.list(filter);
    const entries = result.items; // Extract items from paginated result
    return calculateDevlogStats(entries);
  }

  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    await this.initialize();

    // Load all entries from storage for analysis
    const result = await this.list();
    const allDevlogs = result.items;

    // Delegate to shared utility function
    return calculateTimeSeriesStats(allDevlogs, request);
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

    // Build flexible devlog identification query
    const devlogIdentifiers = [];

    // Method 1: Marker label identification (primary)
    const markerLabel = this.config.markerLabel || 'devlog';
    devlogIdentifiers.push(`label:"${markerLabel}"`);

    // Method 2: Metadata-based identification (fallback)
    devlogIdentifiers.push(`"DEVLOG_METADATA:" in:body`);

    // Use OR logic to match any identification method
    if (devlogIdentifiers.length > 0) {
      query += ` (${devlogIdentifiers.join(' OR ')})`;
    }

    if (filter?.status && filter.status.length > 0) {
      const statusQueries = filter.status.map((status) => {
        if (status === 'done') {
          return this.config.mapping.useStateReason ? 'is:closed state:completed' : 'is:closed';
        } else if (status === 'cancelled') {
          return this.config.mapping.useStateReason ? 'is:closed state:not_planned' : 'is:closed';
        } else if (status === 'new') {
          if (this.config.mapping.useStateReason) {
            return 'is:open';
          } else {
            // Use clean status labels
            return `is:open -label:"status:"`;
          }
        } else {
          if (this.config.mapping.useStateReason) {
            return 'is:open'; // Native state_reason doesn't distinguish these
          } else {
            // Use clean status labels (status:value)
            return `label:"status:${status}"`;
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
        // Use clean native labels
        const typeQueries = filter.type.map((type) => {
          const githubLabel = this.mapDevlogTypeToGitHubLabel(type);
          return `label:"${githubLabel}"`;
        });
        query += ` (${typeQueries.join(' OR ')})`;
      }
    }

    if (filter?.priority && filter.priority.length > 0) {
      const priorityQueries = filter.priority.map((priority) => {
        // Use clean priority labels (priority:value)
        return `label:"priority:${priority}"`;
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

  // Type mapping methods now use shared utilities
  private mapDevlogTypeToGitHubType(devlogType: string): string {
    return mapDevlogTypeToGitHubType(devlogType);
  }

  private mapDevlogTypeToGitHubLabel(devlogType: string): string {
    return mapDevlogTypeToGitHubLabel(devlogType);
  }

  private isEmptyFilter(filter: DevlogFilter): boolean {
    return (
      !filter.status?.length &&
      !filter.type?.length &&
      !filter.priority?.length &&
      !filter.assignee &&
      !filter.fromDate &&
      !filter.toDate
    );
  }

  private looksLikeDevlogIssue(issue: GitHubIssue): boolean {
    const markerLabel = this.config.markerLabel || 'devlog';

    // Check if issue has the marker label
    const hasMarkerLabel = issue.labels.some((label: any) => label.name === markerLabel);

    // Check for new base64 metadata format (primary detection method)
    const hasDevlogMetadata = issue.body?.includes('<!-- DEVLOG_METADATA:') ?? false;

    return hasMarkerLabel || hasDevlogMetadata;
  }

  private normalizeConfig(config: GitHubStorageConfig): Required<GitHubStorageConfig> {
    return {
      ...config,
      apiUrl: config.apiUrl || 'https://api.github.com',
      branch: config.branch || 'main',
      labelsPrefix: config.labelsPrefix || 'devlog', // Keep for backward compatibility
      markerLabel: config.markerLabel || 'devlog',
      enableEmojiTitles: config.enableEmojiTitles ?? true,
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

  // ===== Chat Storage Operations (Not implemented for GitHub provider) =====
  // Note: GitHub provider focuses on devlog entries via Issues. Chat data should use database providers.

  async saveChatSession(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async getChatSession(): Promise<null> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async listChatSessions(): Promise<[]> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async deleteChatSession(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async saveChatMessages(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async getChatMessages(): Promise<[]> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async searchChatContent(): Promise<[]> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async getChatStats(): Promise<any> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error(
      'Chat storage is not supported in GitHub provider. Use SQLite or database provider for chat data.',
    );
  }

  /**
   * Convert GitHub comments to DevlogNotes
   */
  private commentsToNotes(comments: GitHubComment[]): DevlogNote[] {
    return comments.map((comment) => ({
      id: comment.id.toString(),
      content: this.parseNoteFromComment(comment.body),
      timestamp: comment.created_at,
      category: this.extractCategoryFromComment(comment.body),
      codeChanges: this.extractCodeChangesFromComment(comment.body),
      files: this.extractFilesFromComment(comment.body),
    }));
  }

  /**
   * Convert DevlogNotes to GitHub comment bodies
   */
  private noteToCommentBody(note: DevlogNote): string {
    // Use emoji formatting for the note content
    const formattedContent = formatGitHubComment(note.content, note.category, {
      includeEmoji: this.config.enableEmojiTitles, // Use same config as title emojis
      includeTimestamp: true,
      timestamp: note.timestamp,
    });

    // Add metadata markers
    const metadata: string[] = [];

    if (note.category && note.category !== 'progress') {
      metadata.push(`<!-- devlog-note-category: ${note.category} -->`);
    }

    if (note.codeChanges) {
      metadata.push(`<!-- devlog-note-codeChanges: ${note.codeChanges} -->`);
    }

    if (note.files && note.files.length > 0) {
      metadata.push(`<!-- devlog-note-files: ${note.files.join(',')} -->`);
    }

    // Add files and code changes to the visible content if present
    let additionalInfo = '';
    if (note.files && note.files.length > 0) {
      additionalInfo += `\n\n📁 **Files:** ${note.files.map((f) => `\`${f}\``).join(', ')}`;
    }

    if (note.codeChanges) {
      additionalInfo += `\n\n💻 **Code Changes:** ${note.codeChanges}`;
    }

    const fullContent = formattedContent + additionalInfo;

    return metadata.length > 0 ? `${metadata.join('\n')}\n\n${fullContent}` : fullContent;
  }

  /**
   * Parse note content from comment body (removing metadata)
   */
  private parseNoteFromComment(commentBody: string): string {
    // Remove metadata comments
    return commentBody.replace(/<!-- devlog-note-\w+: [^>]+ -->\n?/g, '').trim();
  }

  /**
   * Extract category from comment metadata
   */
  private extractCategoryFromComment(commentBody: string): NoteCategory {
    const match = commentBody.match(/<!-- devlog-note-category: ([^>]+) -->/);
    const category = match ? match[1] : 'progress';

    // Validate that it's a valid NoteCategory
    const validCategories: NoteCategory[] = [
      'progress',
      'issue',
      'solution',
      'idea',
      'reminder',
      'feedback',
    ];
    return validCategories.includes(category as NoteCategory)
      ? (category as NoteCategory)
      : 'progress';
  }

  /**
   * Extract code changes from comment metadata
   */
  private extractCodeChangesFromComment(commentBody: string): string | undefined {
    const match = commentBody.match(/<!-- devlog-note-codeChanges: ([^>]+) -->/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract files from comment metadata
   */
  private extractFilesFromComment(commentBody: string): string[] {
    const match = commentBody.match(/<!-- devlog-note-files: ([^>]+) -->/);
    return match ? match[1].split(',').map((f) => f.trim()) : [];
  }

  /**
   * Sync DevlogNotes with GitHub Issue comments
   */
  private async syncNotesWithComments(issueNumber: number, notes: DevlogNote[]): Promise<void> {
    // Get existing comments
    const existingComments = await this.rateLimiter.executeWithRateLimit(async () => {
      return await this.apiClient.getIssueComments(issueNumber);
    });

    // Track which comments correspond to our notes
    const noteCommentMap = new Map<string, GitHubComment>();

    // Find existing comments that match our notes
    for (const comment of existingComments) {
      const noteId = comment.id.toString();
      noteCommentMap.set(noteId, comment);
    }

    // Process each note
    for (const note of notes) {
      const existingComment = noteCommentMap.get(note.id || '');
      const commentBody = this.noteToCommentBody(note);

      if (existingComment) {
        // Update existing comment if content changed
        if (existingComment.body !== commentBody) {
          await this.rateLimiter.executeWithRateLimit(async () => {
            await this.apiClient.updateIssueComment(existingComment.id, { body: commentBody });
          });
        }
        noteCommentMap.delete(note.id || '');
      } else {
        // Create new comment
        const newComment = await this.rateLimiter.executeWithRateLimit(async () => {
          return await this.apiClient.createIssueComment(issueNumber, { body: commentBody });
        });

        // Update note ID to match the created comment ID
        note.id = newComment.id.toString();
      }
    }

    // Delete any remaining comments that no longer have corresponding notes
    for (const [_, comment] of noteCommentMap) {
      await this.rateLimiter.executeWithRateLimit(async () => {
        await this.apiClient.deleteIssueComment(comment.id);
      });
    }
  }
}
