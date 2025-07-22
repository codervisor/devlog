/**
 * Integration service and enterprise integration types
 */

import { DevlogEntry } from './core';

// Integration Service Types
export interface ConflictData {
  localChanges: Partial<DevlogEntry>;
  externalChanges: Partial<DevlogEntry>;
  conflictFields: string[];
}

export interface SyncStatus {
  status: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncAt?: string;
  errorMessage?: string;
  conflictData?: ConflictData;
}

// Enterprise Integration Types (for future use)
export interface EnterpriseIntegration {
  jira?: JiraConfig;
  ado?: AdoConfig;
  slack?: SlackConfig;
  github?: GitHubConfig;
}

export interface JiraConfig {
  baseUrl: string;
  projectKey: string;
  apiToken: string;
  userEmail: string;
}

export interface AdoConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
}

export interface SlackConfig {
  botToken: string;
  channelId: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  projectNumber?: number; // GitHub Project V2 number
  projectId?: string; // GitHub Project V2 ID (for GraphQL)
}
