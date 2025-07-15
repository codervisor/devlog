/**
 * GitHub label management for devlog storage
 */

import { GitHubStorageConfig } from '../types/index.js';
import { GitHubAPIClient } from './github-api.js';

export interface DevlogLabel {
  name: string;
  color: string;
  description: string;
}

export class GitHubLabelManager {
  private apiClient: GitHubAPIClient;
  private config: Required<GitHubStorageConfig>;
  private labelCache: Map<string, boolean> = new Map();

  constructor(apiClient: GitHubAPIClient, config: Required<GitHubStorageConfig>) {
    this.apiClient = apiClient;
    this.config = config;
  }

  /**
   * Ensure all required devlog labels exist in the repository
   */
  async ensureRequiredLabels(): Promise<void> {
    const requiredLabels = this.getRequiredLabels();
    const existingLabels = await this.getExistingLabels();
    
    for (const label of requiredLabels) {
      if (!existingLabels.has(label.name)) {
        try {
          await this.apiClient.createLabel(label.name, label.color, label.description);
          this.labelCache.set(label.name, true);
        } catch (error: any) {
          // If label already exists (race condition), that's fine
          if (error.status !== 422) {
            throw error;
          }
        }
      } else {
        this.labelCache.set(label.name, true);
      }
    }
  }

  /**
   * Check if a label exists
   */
  async labelExists(labelName: string): Promise<boolean> {
    if (this.labelCache.has(labelName)) {
      return this.labelCache.get(labelName)!;
    }

    const existingLabels = await this.getExistingLabels();
    const exists = existingLabels.has(labelName);
    this.labelCache.set(labelName, exists);
    return exists;
  }

  /**
   * Create a label if it doesn't exist
   */
  async ensureLabel(name: string, color: string, description?: string): Promise<void> {
    if (await this.labelExists(name)) {
      return;
    }

    try {
      await this.apiClient.createLabel(name, color, description);
      this.labelCache.set(name, true);
    } catch (error: any) {
      if (error.status !== 422) {
        throw error;
      }
      // Label already exists
      this.labelCache.set(name, true);
    }
  }

  /**
   * Get all required devlog labels
   */
  private getRequiredLabels(): DevlogLabel[] {
    const prefix = this.config.labelsPrefix;
    const labels: DevlogLabel[] = [];
    
    // Create labels based on mapping configuration
    if (this.config.mapping.useNativeLabels) {
      // Use standard GitHub labels when possible
      const nativeLabels = [
        { name: 'bug', color: 'E53E3E', description: 'Something isn\'t working' },
        { name: 'enhancement', color: '0052CC', description: 'New feature or request' },
        { name: 'documentation', color: '36B37E', description: 'Improvements or additions to documentation' },
        { name: 'refactor', color: 'FFC107', description: 'Code refactoring or restructuring' },
        { name: 'task', color: '744C9E', description: 'General task or maintenance work' },
      ];

      // Add priority labels with standard naming
      if (!this.config.mapping.useNativeType) {
        const priorityLabels = [
          { name: 'priority: low', color: 'D3E2FF', description: 'Low priority item' },
          { name: 'priority: medium', color: '579DFF', description: 'Medium priority item' },
          { name: 'priority: high', color: 'FF8B00', description: 'High priority item' },
          { name: 'priority: critical', color: 'DE350B', description: 'Critical priority item' },
        ];
        labels.push(...priorityLabels);
      }

      // Add status labels if not using state_reason
      if (!this.config.mapping.useStateReason) {
        const statusLabels = [
          { name: 'status: in-progress', color: '0052CC', description: 'Currently being worked on' },
          { name: 'status: blocked', color: 'DE350B', description: 'Blocked by dependencies' },
          { name: 'status: in-review', color: 'FFC107', description: 'Under review' },
          { name: 'status: testing', color: 'FF8B00', description: 'In testing phase' },
        ];
        labels.push(...statusLabels);
      }

      labels.push(...nativeLabels);
    } else {
      // Use custom prefixed labels (existing behavior)
      if (!this.config.mapping.useNativeType) {
        const typeLabels = [
          { name: `${prefix}-type:feature`, color: '0052CC', description: 'New feature development' },
          { name: `${prefix}-type:bugfix`, color: 'E53E3E', description: 'Bug fix or error correction' },
          { name: `${prefix}-type:task`, color: '744C9E', description: 'General task or maintenance work' },
          { name: `${prefix}-type:refactor`, color: 'FFC107', description: 'Code refactoring or restructuring' },
          { name: `${prefix}-type:docs`, color: '36B37E', description: 'Documentation updates' },
        ];
        labels.push(...typeLabels);
      }

      const priorityLabels = [
        { name: `${prefix}-priority:low`, color: 'D3E2FF', description: 'Low priority item' },
        { name: `${prefix}-priority:medium`, color: '579DFF', description: 'Medium priority item' },
        { name: `${prefix}-priority:high`, color: 'FF8B00', description: 'High priority item' },
        { name: `${prefix}-priority:critical`, color: 'DE350B', description: 'Critical priority item' },
      ];
      labels.push(...priorityLabels);

      // Status labels (optional if using state_reason)
      if (!this.config.mapping.useStateReason) {
        const statusLabels = [
          { name: `${prefix}-status:in-progress`, color: '0052CC', description: 'Currently being worked on' },
          { name: `${prefix}-status:blocked`, color: 'DE350B', description: 'Blocked by dependencies' },
          { name: `${prefix}-status:in-review`, color: 'FFC107', description: 'Under review' },
          { name: `${prefix}-status:testing`, color: 'FF8B00', description: 'In testing phase' },
        ];
        labels.push(...statusLabels);
      }
    }

    // Always create the special deleted label
    labels.push({ name: `${prefix}-deleted`, color: '8993A4', description: 'Marked for deletion' });

    return labels;
  }

  /**
   * Get existing labels from the repository
   */
  private async getExistingLabels(): Promise<Set<string>> {
    try {
      const labels = await this.apiClient.getLabels();
      return new Set(labels.map(label => label.name));
    } catch (error) {
      console.warn('Failed to fetch existing labels:', error);
      return new Set();
    }
  }
}
