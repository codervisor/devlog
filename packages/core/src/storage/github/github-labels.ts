/**
 * GitHub label management for devlog storage
 */

import { GitHubStorageConfig } from '@/types';
import { GitHubAPIClient } from '@/storage';

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
    const markerLabel = this.config.markerLabel || 'devlog';
    const labels: DevlogLabel[] = [];

    // Always add the marker label to identify devlog-managed issues
    labels.push({
      name: markerLabel,
      color: '1D4ED8',
      description: 'Managed by devlog system',
    });

    // Standard GitHub native type labels
    const typeLabels = [
      { name: 'bug', color: 'E53E3E', description: "Something isn't working" },
      { name: 'enhancement', color: '0052CC', description: 'New feature or request' },
      {
        name: 'documentation',
        color: '36B37E',
        description: 'Improvements or additions to documentation',
      },
      { name: 'refactor', color: 'FFC107', description: 'Code refactoring or restructuring' },
      { name: 'task', color: '744C9E', description: 'General task or maintenance work' },
    ];
    labels.push(...typeLabels);

    // Clean priority labels
    const priorityLabels = [
      { name: 'priority:low', color: 'D3E2FF', description: 'Low priority item' },
      { name: 'priority:medium', color: '579DFF', description: 'Medium priority item' },
      { name: 'priority:high', color: 'FF8B00', description: 'High priority item' },
      { name: 'priority:critical', color: 'DE350B', description: 'Critical priority item' },
    ];
    labels.push(...priorityLabels);

    // Clean status labels (only if not using GitHub's native state_reason)
    if (!this.config.mapping.useStateReason) {
      const statusLabels = [
        { name: 'status:in-progress', color: '0052CC', description: 'Currently being worked on' },
        { name: 'status:blocked', color: 'DE350B', description: 'Blocked by dependencies' },
        { name: 'status:in-review', color: 'FFC107', description: 'Under review' },
        { name: 'status:testing', color: 'FF8B00', description: 'In testing phase' },
      ];
      labels.push(...statusLabels);
    }

    return labels;
  }

  /**
   * Get existing labels from the repository
   */
  private async getExistingLabels(): Promise<Set<string>> {
    try {
      const labels = await this.apiClient.getLabels();
      return new Set(labels.map((label) => label.name));
    } catch (error) {
      console.warn('Failed to fetch existing labels:', error);
      return new Set();
    }
  }
}
