/**
 * GitHub API client for devlog storage operations
 */

import { GitHubStorageConfig } from '../types/index.js';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  milestone?: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    due_on?: string;
  } | null;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface CreateCommentRequest {
  body: string;
}

export interface UpdateCommentRequest {
  body: string;
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  permissions: {
    push: boolean;
    pull: boolean;
    admin: boolean;
  };
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
  type?: string;
}

export interface UpdateIssueRequest {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
  type?: string | null;
}

export interface GitHubSearchResponse {
  total_count: number;
  items: GitHubIssue[];
}

export class GitHubAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public responseBody: string,
  ) {
    super(`GitHub API error ${status}: ${statusText}`);
    this.name = 'GitHubAPIError';
  }
}

export class GitHubAPIClient {
  private config: Required<GitHubStorageConfig>;
  private baseURL: string;

  constructor(config: Required<GitHubStorageConfig>) {
    this.config = config;
    this.baseURL = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}`;
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

  async listIssues(state: 'open' | 'closed' | 'all' = 'all', per_page = 100, page = 1): Promise<GitHubIssue[]> {
    const params = new URLSearchParams({
      state,
      per_page: per_page.toString(),
      page: page.toString(),
      sort: 'updated',
      direction: 'desc'
    });
    return this.request(`/issues?${params}`);
  }

  async searchIssues(query: string): Promise<GitHubIssue[]> {
    const response: GitHubSearchResponse = await this.request(
      `/search/issues?q=${encodeURIComponent(query)}`,
      'GET',
      undefined,
      true,
    );
    console.debug(response);
    return response.items;
  }

  async searchIssuesCount(query: string): Promise<number> {
    const response: GitHubSearchResponse = await this.request(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
      'GET',
      undefined,
      true,
    );
    return response.total_count;
  }

  async getRepository(): Promise<GitHubRepository> {
    return this.request('');
  }

  async createLabel(name: string, color: string, description?: string): Promise<void> {
    await this.request('/labels', 'POST', {
      name,
      color,
      description,
    });
  }

  async getLabels(): Promise<Array<{ name: string; color: string }>> {
    return this.request('/labels');
  }

  // GitHub Comments API
  async getIssueComments(issueNumber: number): Promise<GitHubComment[]> {
    return this.request(`/issues/${issueNumber}/comments`);
  }

  async createIssueComment(issueNumber: number, commentData: CreateCommentRequest): Promise<GitHubComment> {
    return this.request(`/issues/${issueNumber}/comments`, 'POST', commentData);
  }

  async updateIssueComment(commentId: number, commentData: UpdateCommentRequest): Promise<GitHubComment> {
    return this.request(`/issues/comments/${commentId}`, 'PATCH', commentData);
  }

  async deleteIssueComment(commentId: number): Promise<void> {
    await this.request(`/issues/comments/${commentId}`, 'DELETE');
  }

  async updateLabel(
    name: string,
    data: { new_name?: string; color?: string; description?: string },
  ): Promise<void> {
    await this.request(`/labels/${encodeURIComponent(name)}`, 'PATCH', data);
  }

  private async request(
    path: string,
    method = 'GET',
    body?: any,
    useSearchAPI = false,
  ): Promise<any> {
    const url = useSearchAPI ? `${this.config.apiUrl}${path}` : `${this.baseURL}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'devlog-github-storage/1.0.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new GitHubAPIError(response.status, response.statusText, responseBody);
    }

    return response.json();
  }
}
