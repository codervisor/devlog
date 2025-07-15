# GitHub Issues Storage Provider Design Document

**Status:** Design Complete, Implementation Pending  
**Related Devlog:** [Devlog #49](../../.devlog/entries/) - Implement GitHub Issues Storage Provider  
**Created:** July 10, 2025  
**Updated:** July 10, 2025  
**Author:** AI Agent  
**Priority:** High  

## Overview

This document outlines the design for implementing a GitHub Issues storage provider that uses GitHub Issues as the primary storage backend for devlog entries. This is distinct from the existing GitHub integration service, which syncs devlog data TO GitHub from other storage backends.

## Problem Statement

Currently, the devlog system supports local storage (JSON, SQLite) and database storage (MySQL, PostgreSQL), but teams that heavily use GitHub for project management would benefit from having their devlog entries stored directly as GitHub Issues. This would:

1. **Reduce Tool Fragmentation**: Keep devlog entries in the same system as code, PRs, and project planning
2. **Leverage GitHub Features**: Use GitHub's native issue tracking, labels, assignees, and search
3. **Enable Natural Collaboration**: Team members can comment and collaborate on devlog entries natively
4. **Simplify Workflows**: No need to sync between systems - GitHub Issues IS the storage

## Solution Architecture

### Core Design Principles

1. **Storage vs Integration Distinction**: This is PRIMARY storage, not synchronization
2. **Follow Existing Patterns**: Implement the same `StorageProvider` interface as other backends
3. **Leverage GitHub Native Features**: Use issues, labels, assignees, milestones naturally
4. **Handle API Constraints**: Graceful rate limiting, error handling, and retry logic
5. **Bidirectional Mapping**: Perfect conversion between devlog entries and GitHub issues

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   DevLog Core                               │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer                                              │
│  ├── JsonStorageProvider                                   │
│  ├── SQLiteStorageProvider                                 │
│  ├── PostgreSQLStorageProvider                             │
│  ├── MySQLStorageProvider                                  │
│  └── GitHubStorageProvider (NEW)                           │
├─────────────────────────────────────────────────────────────┤
│  GitHub API Layer                                          │
│  ├── GitHub REST API Client                               │
│  ├── Rate Limiter                                         │
│  ├── Data Mapper (DevlogEntry ↔ GitHub Issue)            │
│  └── Label Manager                                        │
├─────────────────────────────────────────────────────────────┤
│  External System                                           │
│  └── GitHub Issues API                                     │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Type Definitions

#### Storage Type Extension
```typescript
// packages/core/src/types/storage.ts
export type StorageType = 'json' | 'sqlite' | 'mysql' | 'postgres' | 'github';
```

#### GitHub Storage Configuration
```typescript
export interface GitHubStorageConfig {
  owner: string;           // Repository owner (user/org)
  repo: string;            // Repository name  
  token: string;           // GitHub Personal Access Token
  apiUrl?: string;         // For GitHub Enterprise (default: api.github.com)
  branch?: string;         // For repository-specific operations
  labelsPrefix?: string;   // Prefix for devlog labels (default: 'devlog')
  rateLimit?: {
    requestsPerHour?: number;  // Default: 5000 (GitHub's limit)
    retryDelay?: number;       // Default: 1000ms
    maxRetries?: number;       // Default: 3
  };
  cache?: {
    enabled?: boolean;       // Default: true
    ttl?: number;           // Cache TTL in ms (default: 300000 = 5min)
  };
}
```

#### Updated Storage Config
```typescript
export interface StorageConfig {
  type: StorageType;
  
  // Existing configs
  json?: JsonConfig;
  connectionString?: string;
  options?: Record<string, any>;
  
  // New GitHub config
  github?: GitHubStorageConfig;
}
```

### 2. Data Mapping Strategy

#### DevlogEntry ↔ GitHub Issue Mapping

| Devlog Field | GitHub Issue Field | Implementation |
|-------------|-------------------|----------------|
| `id` | Issue number (as string) | Use GitHub's auto-generated issue numbers |
| `key` | Derived from title | Generate slug from issue title |
| `title` | Issue title | Direct mapping |
| `description` | Issue body (part 1) | First section of structured body |
| `type` | Label: `devlog-type:feature` | Custom labels with prefix |
| `status` | Issue state + labels | `open/closed` + `devlog-status:in-progress` |
| `priority` | Label: `devlog-priority:high` | Custom labels with prefix |
| `assignee` | Issue assignees[0] | Use GitHub's native assignee field |
| `createdAt` | Issue created_at | GitHub's native timestamp |
| `updatedAt` | Issue updated_at | GitHub's native timestamp |
| `notes` | Issue body (JSON section) | Structured JSON in issue body |
| `decisions` | Issue body (JSON section) | Structured JSON in issue body |
| `context` | Issue body (JSON section) | Structured JSON in issue body |
| `aiContext` | Issue body (JSON section) | Structured JSON in issue body |
| `files` | Issue body (JSON section) | Structured JSON in issue body |
| `relatedDevlogs` | Issue body (JSON section) | References to other issue numbers |
| `externalReferences` | Issue body (JSON section) | External links and references |

#### GitHub Issue Body Structure
```markdown
<!-- DEVLOG_METADATA_START -->
## Description
User-provided description here...

## Technical Context
Technical context details...

## Business Context  
Business context details...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

<!-- DEVLOG_DATA -->
```json
{
  "version": "1.0.0",
  "devlogKey": "implement-auth-system",
  "notes": [
    {
      "id": "note-1",
      "content": "Made progress on OAuth implementation",
      "category": "progress",
      "timestamp": "2025-07-10T10:00:00Z",
      "files": ["src/auth/oauth.ts"]
    }
  ],
  "decisions": [
    {
      "id": "decision-1", 
      "decision": "Use OAuth 2.0 for authentication",
      "rationale": "Industry standard, well-supported",
      "alternatives": ["Custom tokens", "SAML"],
      "decisionMaker": "john-doe",
      "timestamp": "2025-07-10T09:00:00Z"
    }
  ],
  "context": {
    "businessContext": "Users need secure login",
    "technicalContext": "Integrate with existing React app",
    "acceptanceCriteria": ["Secure login", "Social OAuth", "Remember me"]
  },
  "aiContext": {
    "summary": "Authentication system implementation",
    "keyInsights": ["OAuth complexity", "Security requirements"],
    "suggestedNextSteps": ["Implement OAuth flow", "Add tests"],
    "openQuestions": ["Which OAuth providers?"]
  },
  "files": ["src/auth/", "docs/auth.md"],
  "relatedDevlogs": ["user-management", "api-security"],
  "externalReferences": [
    {
      "system": "jira",
      "id": "AUTH-123",
      "url": "https://company.atlassian.net/browse/AUTH-123",
      "title": "Implement authentication",
      "status": "In Progress"
    }
  ]
}
```
<!-- DEVLOG_METADATA_END -->
```

#### Label Strategy
- **Type Labels**: `devlog-type:feature`, `devlog-type:bugfix`, `devlog-type:task`, etc.
- **Status Labels**: `devlog-status:new`, `devlog-status:in-progress`, `devlog-status:review`, etc.
- **Priority Labels**: `devlog-priority:low`, `devlog-priority:medium`, `devlog-priority:high`, `devlog-priority:critical`
- **Custom Labels**: Allow additional labels for organization-specific needs

### 3. Core Implementation

#### GitHubStorageProvider Class
```typescript
// packages/core/src/storage/github-storage.ts
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
    this.cache = new LRUCache({ max: 100, ttl: this.config.cache.ttl });
    this.dataMapper = new DevlogGitHubMapper(this.config);
    this.labelManager = new GitHubLabelManager(this.apiClient, this.config);
  }

  async initialize(): Promise<void> {
    // Verify API access
    await this.verifyAccess();
    
    // Initialize required labels
    await this.labelManager.ensureRequiredLabels();
    
    this.initialized = true;
  }

  async exists(id: DevlogId): Promise<boolean> {
    const issueNumber = parseInt(id.toString(), 10);
    if (isNaN(issueNumber)) return false;
    
    try {
      await this.apiClient.getIssue(issueNumber);
      return true;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const cacheKey = `issue-${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const issueNumber = parseInt(id.toString(), 10);
    if (isNaN(issueNumber)) return null;

    try {
      const issue = await this.apiClient.getIssue(issueNumber);
      const devlogEntry = this.dataMapper.issueToDevlog(issue);
      
      this.cache.set(cacheKey, devlogEntry);
      return devlogEntry;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async save(entry: DevlogEntry): Promise<void> {
    const issueData = this.dataMapper.devlogToIssue(entry);
    
    if (await this.exists(entry.id)) {
      // Update existing issue
      const issueNumber = parseInt(entry.id.toString(), 10);
      await this.apiClient.updateIssue(issueNumber, issueData);
    } else {
      // Create new issue
      const issue = await this.apiClient.createIssue(issueData);
      // Update entry ID to match GitHub issue number
      entry.id = issue.number.toString();
    }
    
    // Invalidate cache
    this.cache.delete(`issue-${entry.id}`);
  }

  async delete(id: DevlogId): Promise<void> {
    const issueNumber = parseInt(id.toString(), 10);
    if (isNaN(issueNumber)) {
      throw new Error(`Invalid issue number: ${id}`);
    }

    // Close the issue (GitHub doesn't allow permanent deletion)
    await this.apiClient.updateIssue(issueNumber, {
      state: 'closed',
      labels: ['devlog-deleted']
    });
    
    // Invalidate cache
    this.cache.delete(`issue-${id}`);
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    const searchQuery = this.buildSearchQuery(filter);
    const issues = await this.apiClient.searchIssues(searchQuery);
    
    return issues.map(issue => this.dataMapper.issueToDevlog(issue));
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const searchQuery = `repo:${this.config.owner}/${this.config.repo} is:issue ${query}`;
    const issues = await this.apiClient.searchIssues(searchQuery);
    
    return issues.map(issue => this.dataMapper.issueToDevlog(issue));
  }

  async getStats(): Promise<DevlogStats> {
    // Use GitHub's search API to get counts
    const queries = {
      total: `repo:${this.config.owner}/${this.config.repo} is:issue label:devlog-type`,
      open: `repo:${this.config.owner}/${this.config.repo} is:issue is:open label:devlog-type`,
      inProgress: `repo:${this.config.owner}/${this.config.repo} is:issue label:"devlog-status:in-progress"`,
      // ... other status queries
    };

    const [total, open, inProgress] = await Promise.all([
      this.apiClient.searchIssuesCount(queries.total),
      this.apiClient.searchIssuesCount(queries.open),
      this.apiClient.searchIssuesCount(queries.inProgress),
    ]);

    return {
      total,
      byStatus: {
        new: 0,
        'in-progress': inProgress,
        review: 0,
        testing: 0,
        done: total - open,
        archived: 0,
      },
      byType: {
        feature: 0,
        bugfix: 0,
        task: 0,
        refactor: 0,
        docs: 0,
      },
      byPriority: {
        low: 0,
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
    return 'pending';
  }

  // Helper methods
  private buildSearchQuery(filter?: DevlogFilter): string {
    let query = `repo:${this.config.owner}/${this.config.repo} is:issue`;
    
    if (filter?.status) {
      query += ` label:"devlog-status:${filter.status}"`;
    }
    
    if (filter?.type) {
      query += ` label:"devlog-type:${filter.type}"`;
    }
    
    if (filter?.priority) {
      query += ` label:"devlog-priority:${filter.priority}"`;
    }
    
    if (filter?.assignee) {
      query += ` assignee:${filter.assignee}`;
    }
    
    return query;
  }

  private normalizeConfig(config: GitHubStorageConfig): Required<GitHubStorageConfig> {
    return {
      ...config,
      apiUrl: config.apiUrl || 'https://api.github.com',
      branch: config.branch || 'main',
      labelsPrefix: config.labelsPrefix || 'devlog',
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
      await this.apiClient.getRepository();
      
      // Test issue creation permissions (dry run)
      await this.apiClient.getRepositoryPermissions();
      
    } catch (error) {
      throw new Error(
        `GitHub API access verification failed: ${error.message}. ` +
        `Please check your token permissions and repository access.`
      );
    }
  }
}
```

### 4. Supporting Classes

#### GitHub API Client
```typescript
// packages/core/src/utils/github-api.ts
export class GitHubAPIClient {
  private config: GitHubStorageConfig;
  private baseURL: string;

  constructor(config: GitHubStorageConfig) {
    this.config = config;
    this.baseURL = `${config.apiUrl}/repos/${config.owner}/${config.repo}`;
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.request(`/issues/${issueNumber}`);
  }

  async createIssue(issueData: CreateIssueRequest): Promise<GitHubIssue> {
    return this.request('/issues', 'POST', issueData);
  }

  async updateIssue(issueNumber: number, issueData: UpdateIssueRequest): Promise<GitHubIssue> {
    return this.request(`/issues/${issueNumber}`, 'PATCH', issueData);
  }

  async searchIssues(query: string): Promise<GitHubIssue[]> {
    const response = await this.request(`/search/issues?q=${encodeURIComponent(query)}`);
    return response.items;
  }

  async searchIssuesCount(query: string): Promise<number> {
    const response = await this.request(`/search/issues?q=${encodeURIComponent(query)}&per_page=1`);
    return response.total_count;
  }

  async getRepository(): Promise<GitHubRepository> {
    return this.request('');
  }

  async getRepositoryPermissions(): Promise<any> {
    return this.request('/collaborators/permissions');
  }

  private async request(path: string, method = 'GET', body?: any): Promise<any> {
    const url = path.startsWith('/search') 
      ? `${this.config.apiUrl}${path}`
      : `${this.baseURL}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${this.config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new GitHubAPIError(response.status, response.statusText, await response.text());
    }

    return response.json();
  }
}
```

#### Rate Limiter
```typescript
// packages/core/src/utils/rate-limiter.ts
export class RateLimiter {
  private requestsPerHour: number;
  private retryDelay: number;
  private maxRetries: number;
  private requestTimes: number[] = [];

  constructor(config: GitHubStorageConfig['rateLimit']) {
    this.requestsPerHour = config.requestsPerHour;
    this.retryDelay = config.retryDelay;
    this.maxRetries = config.maxRetries;
  }

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitIfNeeded();
    
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        this.recordRequest();
        return await fn();
      } catch (error) {
        if (error.status === 403 && error.message.includes('rate limit')) {
          attempts++;
          if (attempts >= this.maxRetries) {
            throw new Error(`Rate limit exceeded after ${this.maxRetries} attempts`);
          }
          await this.delay(this.retryDelay * Math.pow(2, attempts));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Remove old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo);
    
    if (this.requestTimes.length >= this.requestsPerHour) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = oldestRequest + 60 * 60 * 1000 - now;
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }
  }

  private recordRequest(): void {
    this.requestTimes.push(Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. Configuration Examples

#### devlog.config.json
```json
{
  "storage": {
    "type": "github",
    "github": {
      "owner": "myorg",
      "repo": "my-project",
      "token": "${GITHUB_TOKEN}",
      "labelsPrefix": "devlog",
      "rateLimit": {
        "requestsPerHour": 4000,
        "retryDelay": 1000,
        "maxRetries": 3
      },
      "cache": {
        "enabled": true,
        "ttl": 300000
      }
    }
  }
}
```

#### Environment Variables
```bash
# Required
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_OWNER=myorg  
GITHUB_REPO=my-project

# Optional
GITHUB_API_URL=https://api.github.com  # For GitHub Enterprise
GITHUB_LABELS_PREFIX=devlog
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. **Type Definitions**: Update storage types and configuration interfaces
2. **Storage Provider**: Implement GitHubStorageProvider class
3. **API Client**: Implement GitHub API client with authentication
4. **Data Mapper**: Implement bidirectional DevlogEntry ↔ GitHub Issue mapping
5. **Factory Integration**: Update StorageProviderFactory

### Phase 2: Advanced Features (Week 3-4)
1. **Rate Limiting**: Implement intelligent rate limiting and retry logic
2. **Label Management**: Auto-create and manage devlog-specific labels
3. **Caching**: Implement intelligent caching for improved performance
4. **Error Handling**: Comprehensive error handling and recovery
5. **Search**: Leverage GitHub's search API for advanced queries

### Phase 3: Testing & Documentation (Week 5-6)
1. **Unit Tests**: Comprehensive test suite for all components
2. **Integration Tests**: End-to-end tests with GitHub API
3. **Documentation**: Setup guides, API documentation, examples
4. **Migration Guide**: Help users migrate from other storage types
5. **Performance Testing**: Verify rate limiting and caching effectiveness

## Files to Implement

### New Files
```
packages/core/src/storage/github-storage.ts         # Main storage provider
packages/core/src/utils/github-api.ts               # GitHub API client
packages/core/src/utils/github-mapper.ts            # Data mapping utilities
packages/core/src/utils/github-labels.ts            # Label management
packages/core/src/utils/rate-limiter.ts             # Rate limiting
packages/core/src/__tests__/github-storage.test.ts  # Comprehensive tests
packages/core/src/__tests__/github-api.test.ts      # API client tests
```

### Files to Modify
```
packages/core/src/types/storage.ts                   # Add GitHub types
packages/core/src/storage/storage-provider.ts       # Add GitHub case
packages/core/src/configuration-manager.ts          # GitHub config support
docs/guides/GITHUB_STORAGE_SETUP.md                # Setup documentation
```

## Security Considerations

### Authentication
- **Personal Access Tokens**: Support classic and fine-grained tokens
- **Token Validation**: Verify token permissions on initialization
- **Secure Storage**: Never log or expose tokens in error messages

### Permissions Required
- **Issues**: Read and Write (to create, update, read issues)
- **Repository**: Read (to access repository metadata)
- **Pull Requests**: Read (optional, for linking to PRs)

### Rate Limiting
- **Respect GitHub Limits**: 5000 requests/hour for authenticated users
- **Intelligent Backoff**: Exponential backoff with jitter
- **Cache Aggressively**: Minimize API calls through smart caching

## Error Handling

### API Errors
- **403 Forbidden**: Token permissions or rate limiting
- **404 Not Found**: Repository or issue doesn't exist
- **422 Unprocessable**: Invalid data in request
- **500/502/503**: GitHub service issues

### Network Errors
- **Connection Timeout**: Retry with exponential backoff
- **DNS Resolution**: Clear error messages for connectivity
- **Intermittent Failures**: Automatic retry with circuit breaker

### Data Integrity
- **Malformed Issue Body**: Graceful parsing with fallbacks
- **Missing Labels**: Auto-create required labels
- **Concurrent Updates**: Handle optimistic locking conflicts

## Performance Optimization

### Caching Strategy
- **Issue Metadata**: Cache issue data for 5 minutes
- **Label Information**: Cache label mappings for 1 hour
- **Search Results**: Cache search results for 2 minutes
- **Repository Info**: Cache repository metadata for 24 hours

### Batch Operations
- **Bulk Label Creation**: Create multiple labels in batch
- **Parallel Requests**: Process independent operations concurrently
- **Search Optimization**: Use GitHub's search API efficiently

### Memory Management
- **LRU Cache**: Bounded cache with automatic eviction
- **Streaming**: Handle large result sets without memory explosion
- **Connection Pooling**: Reuse HTTP connections efficiently

## Migration Strategy

### From Other Storage Types
1. **Export Data**: Use existing storage provider to export all devlog entries
2. **Transform Format**: Convert to GitHub issue format
3. **Bulk Import**: Create GitHub issues for all entries
4. **Verify Integrity**: Ensure all data migrated correctly
5. **Update Configuration**: Switch to GitHub storage type

### Rollback Plan
1. **Export from GitHub**: Use GitHub storage to export entries
2. **Convert Back**: Transform to target storage format
3. **Import to New Storage**: Use target storage provider
4. **Verify**: Ensure data integrity maintained

## Success Criteria

### Functional Requirements
- ✅ **Complete StorageProvider Interface**: All methods implemented correctly
- ✅ **Bidirectional Mapping**: Perfect conversion between devlog entries and GitHub issues
- ✅ **Configuration Support**: Comprehensive configuration options
- ✅ **Error Handling**: Graceful handling of all error conditions
- ✅ **Rate Limiting**: Respects GitHub API limits with intelligent backoff

### Performance Requirements
- ✅ **Response Time**: Average API response under 1 second
- ✅ **Cache Hit Rate**: >80% cache hit rate for read operations
- ✅ **Rate Limit Efficiency**: <50% of available rate limit used during normal operation
- ✅ **Memory Usage**: Bounded memory usage with LRU eviction

### Integration Requirements
- ✅ **DevlogManager Integration**: Works seamlessly with existing DevlogManager
- ✅ **MCP Tool Support**: Full support for all MCP devlog operations
- ✅ **Configuration Management**: Integrates with existing configuration system
- ✅ **Factory Pattern**: Properly integrated with StorageProviderFactory

## Future Enhancements

### Advanced Features
- **GitHub Projects Integration**: Sync with GitHub Projects v2
- **Pull Request Linking**: Automatic linking between devlog entries and PRs
- **Release Integration**: Include devlog entries in release notes
- **Webhook Support**: Real-time updates from GitHub webhooks

### Enterprise Features
- **GitHub Enterprise**: Full support for GitHub Enterprise Server
- **SAML Integration**: Support enterprise authentication
- **Audit Logging**: Comprehensive audit trail for enterprise compliance
- **Bulk Operations**: Advanced bulk import/export capabilities

### Developer Experience
- **CLI Commands**: Dedicated CLI commands for GitHub storage
- **VS Code Extension**: Enhanced VS Code integration
- **Local Development**: Offline mode with sync when online
- **Debug Tools**: Enhanced debugging and troubleshooting tools

## Conclusion

The GitHub Issues Storage Provider will enable teams to use GitHub Issues as their primary devlog storage, eliminating tool fragmentation and leveraging GitHub's native features. The implementation follows established patterns in the codebase while providing robust error handling, rate limiting, and performance optimization.

This design provides a solid foundation for implementation while maintaining flexibility for future enhancements and enterprise requirements.
