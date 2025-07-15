/**
 * Data mapper for converting between DevlogEntry and GitHub Issues
 */

import { DevlogEntry, DevlogStatus, DevlogType, DevlogPriority, DevlogNote, Decision, GitHubStorageConfig, ExternalReference } from '../types/index.js';
import { GitHubIssue, CreateIssueRequest, UpdateIssueRequest } from './github-api.js';
import { 
  mapGitHubTypeToDevlogType, 
  mapNativeLabelsToDevlogType 
} from './github-type-mapper.js';

export interface DevlogMetadata {
  version: string;
  devlogKey?: string;
  notes: DevlogNote[];
  decisions: Decision[];
  context: {
    businessContext?: string;
    technicalContext?: string;
    acceptanceCriteria: string[];
  };
  aiContext: {
    currentSummary?: string;
    keyInsights: string[];
    suggestedNextSteps: string[];
    openQuestions: string[];
  };
  files: string[];
  relatedDevlogs: string[];
  externalReferences: ExternalReference[];
}

export class DevlogGitHubMapper {
  private config: Required<GitHubStorageConfig>;

  constructor(config: Required<GitHubStorageConfig>) {
    this.config = config;
  }

  /**
   * Convert a GitHub Issue to a DevlogEntry
   */
  issueToDevlog(issue: GitHubIssue): DevlogEntry {
    const { userContent, metadata } = this.parseIssueBody(issue.body || '');
    
    // Determine type - use native type field or fall back to labels
    let type: DevlogType = 'task';
    if (this.config.mapping.useNativeType && (issue as any).type) {
      type = this.mapGitHubTypeToDevlogType((issue as any).type);
    } else {
      // Extract devlog data from labels (existing behavior)
      const typeLabel = issue.labels.find(l => l.name.startsWith(`${this.config.labelsPrefix}-type:`));
      if (typeLabel) {
        type = this.extractEnumFromLabel(typeLabel.name, 'type') as DevlogType || 'task';
      } else if (this.config.mapping.useNativeLabels) {
        // Map from native GitHub labels
        type = this.mapNativeLabelsToDevlogType(issue.labels.map(l => l.name));
      }
    }

    // Determine status - use state_reason or fall back to labels/state
    let status: DevlogStatus = 'new';
    if (this.config.mapping.useStateReason) {
      status = this.mapGitHubStateToDevlogStatus(issue.state, undefined, issue.state_reason);
    } else {
      const statusLabel = issue.labels.find(l => 
        l.name.startsWith(`${this.config.labelsPrefix}-status:`) ||
        l.name.startsWith('status:')
      );
      status = this.mapGitHubStateToDevlogStatus(issue.state, statusLabel?.name);
    }

    // Determine priority - from labels
    let priority: DevlogPriority = 'medium';
    const priorityLabel = issue.labels.find(l => 
      l.name.startsWith(`${this.config.labelsPrefix}-priority:`) ||
      l.name.startsWith('priority:')
    );
    if (priorityLabel) {
      const extractedPriority = this.extractEnumFromLabel(priorityLabel.name, 'priority') ||
                               priorityLabel.name.replace(/^priority:\s*/, '');
      if (['low', 'medium', 'high', 'critical'].includes(extractedPriority)) {
        priority = extractedPriority as DevlogPriority;
      }
    }
    
    return {
      id: issue.number,
      key: metadata?.devlogKey || this.titleToKey(issue.title),
      title: issue.title,
      description: userContent.description || '',
      type,
      status,
      priority,
      assignee: issue.assignees[0]?.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      notes: metadata?.notes || [],
      files: metadata?.files || [],
      relatedDevlogs: metadata?.relatedDevlogs || [],
      context: {
        businessContext: metadata?.context?.businessContext || userContent.businessContext || '',
        technicalContext: metadata?.context?.technicalContext || userContent.technicalContext || '',
        dependencies: [],
        decisions: metadata?.decisions || [],
        acceptanceCriteria: metadata?.context?.acceptanceCriteria || userContent.acceptanceCriteria || [],
        risks: [],
      },
      aiContext: {
        currentSummary: metadata?.aiContext?.currentSummary || '',
        keyInsights: metadata?.aiContext?.keyInsights || [],
        suggestedNextSteps: metadata?.aiContext?.suggestedNextSteps || [],
        openQuestions: metadata?.aiContext?.openQuestions || [],
        relatedPatterns: [],
        lastAIUpdate: new Date().toISOString(),
        contextVersion: 1,
      },
      externalReferences: metadata?.externalReferences || [],
    };
  }

  /**
   * Convert a DevlogEntry to GitHub Issue data for creation
   */
  devlogToIssue(entry: DevlogEntry): CreateIssueRequest | UpdateIssueRequest {
    const body = this.formatIssueBody(entry);
    const labels = this.generateLabels(entry);
    const issueData: CreateIssueRequest | UpdateIssueRequest = {
      title: entry.title,
      body,
      labels,
      assignees: entry.assignee ? [entry.assignee] : undefined,
    };

    // Use native type field if configured
    if (this.config.mapping.useNativeType) {
      issueData.type = entry.type;
    }

    // Set state and state_reason based on devlog status
    if (this.config.mapping.useStateReason) {
      const { state, state_reason } = this.mapDevlogStatusToGitHubState(entry.status);
      (issueData as UpdateIssueRequest).state = state;
      if (state_reason) {
        (issueData as UpdateIssueRequest).state_reason = state_reason;
      }
    }

    // Add milestone if available (milestone is already supported in GitHub issues)
    // This could be used for project/epic grouping
    if (entry.relatedDevlogs?.length || entry.context?.businessContext) {
      // For now, we don't set milestone automatically, but this is where it would go
      // issueData.milestone = someMilestoneNumber;
    }

    return issueData;
  }

  /**
   * Format the issue body with structured data
   */
  private formatIssueBody(entry: DevlogEntry): string {
    const metadata: DevlogMetadata = {
      version: '1.0.0',
      devlogKey: entry.key,
      notes: entry.notes || [],
      decisions: entry.context?.decisions || [],
      context: {
        businessContext: entry.context?.businessContext,
        technicalContext: entry.context?.technicalContext,
        acceptanceCriteria: entry.context?.acceptanceCriteria || [],
      },
      aiContext: {
        currentSummary: entry.aiContext?.currentSummary,
        keyInsights: entry.aiContext?.keyInsights || [],
        suggestedNextSteps: entry.aiContext?.suggestedNextSteps || [],
        openQuestions: entry.aiContext?.openQuestions || [],
      },
      files: entry.files || [],
      relatedDevlogs: entry.relatedDevlogs || [],
      externalReferences: entry.externalReferences || [],
    };

    let body = '<!-- DEVLOG_METADATA_START -->\n';
    
    // User-readable content
    if (entry.description) {
      body += '## Description\n';
      body += `${entry.description}\n\n`;
    }
    
    if (entry.context?.technicalContext) {
      body += '## Technical Context\n';
      body += `${entry.context.technicalContext}\n\n`;
    }
    
    if (entry.context?.businessContext) {
      body += '## Business Context\n';
      body += `${entry.context.businessContext}\n\n`;
    }
    
    if (entry.context?.acceptanceCriteria && entry.context.acceptanceCriteria.length > 0) {
      body += '## Acceptance Criteria\n';
      entry.context.acceptanceCriteria.forEach(criterion => {
        body += `- [ ] ${criterion}\n`;
      });
      body += '\n';
    }
    
    // Structured metadata
    body += '<!-- DEVLOG_DATA -->\n';
    body += '```json\n';
    body += JSON.stringify(metadata, null, 2);
    body += '\n```\n';
    body += '<!-- DEVLOG_METADATA_END -->\n';
    
    return body;
  }

  /**
   * Parse the issue body to extract user content and metadata
   */
  private parseIssueBody(body: string): { 
    userContent: {
      description?: string;
      technicalContext?: string;
      businessContext?: string;
      acceptanceCriteria?: string[];
    };
    metadata?: DevlogMetadata;
  } {
    const userContent: any = {};
    let metadata: DevlogMetadata | undefined;

    // Extract structured metadata
    const metadataMatch = body.match(/<!-- DEVLOG_DATA -->\n```json\n([\s\S]*?)\n```/);
    if (metadataMatch) {
      try {
        metadata = JSON.parse(metadataMatch[1]);
      } catch (error) {
        console.warn('Failed to parse devlog metadata from GitHub issue:', error);
      }
    }

    // Extract user-readable content
    const sections = body.split(/^## /m);
    for (const section of sections) {
      const lines = section.trim().split('\n');
      const title = lines[0]?.toLowerCase();
      const content = lines.slice(1).join('\n').trim();

      if (title === 'description') {
        userContent.description = content;
      } else if (title === 'technical context') {
        userContent.technicalContext = content;
      } else if (title === 'business context') {
        userContent.businessContext = content;
      } else if (title === 'acceptance criteria') {
        userContent.acceptanceCriteria = content
          .split('\n')
          .filter(line => line.startsWith('- [ ]') || line.startsWith('- [x]'))
          .map(line => line.replace(/^- \[[x ]\] /, ''));
      }
    }

    return { userContent, metadata };
  }

  /**
   * Generate labels for the GitHub issue
   */
  private generateLabels(entry: DevlogEntry): string[] {
    const labels: string[] = [];

    // Use native labels or custom prefixed labels based on configuration
    if (this.config.mapping.useNativeLabels) {
      // Map devlog types to GitHub's native/common labels
      switch (entry.type) {
        case 'feature':
          labels.push('enhancement');
          break;
        case 'bugfix':
          labels.push('bug');
          break;
        case 'docs':
          labels.push('documentation');
          break;
        case 'refactor':
          labels.push('refactor');
          break;
        case 'task':
          // No direct native equivalent, might use a generic label
          labels.push('task');
          break;
        default:
          labels.push(entry.type);
      }

      // Use standard priority labels if not using native type
      if (!this.config.mapping.useNativeType) {
        switch (entry.priority) {
          case 'critical':
            labels.push('priority: critical');
            break;
          case 'high':
            labels.push('priority: high');
            break;
          case 'medium':
            labels.push('priority: medium');
            break;
          case 'low':
            labels.push('priority: low');
            break;
        }
      }
    } else {
      // Use custom prefixed labels (existing behavior)
      if (!this.config.mapping.useNativeType) {
        labels.push(`${this.config.labelsPrefix}-type:${entry.type}`);
      }
      labels.push(`${this.config.labelsPrefix}-priority:${entry.priority}`);
    }

    // Only add status label if not using state_reason and not default status
    if (!this.config.mapping.useStateReason && entry.status !== 'new') {
      const statusLabel = this.config.mapping.useNativeLabels 
        ? `status: ${entry.status}` 
        : `${this.config.labelsPrefix}-status:${entry.status}`;
      labels.push(statusLabel);
    }

    return labels;
  }

  /**
   * Extract enum value from label name
   */
  private extractEnumFromLabel(labelName: string | undefined, type: string): string | undefined {
    if (!labelName) return undefined;
    const prefix = `${this.config.labelsPrefix}-${type}:`;
    return labelName.startsWith(prefix) ? labelName.substring(prefix.length) : undefined;
  }

  /**
   * Map GitHub issue state and status label to devlog status
   */
  private mapGitHubStateToDevlogStatus(state: 'open' | 'closed', statusLabel?: string, stateReason?: 'completed' | 'not_planned' | 'reopened' | null): DevlogStatus {
    if (state === 'closed') {
      if (stateReason === 'not_planned') {
        return 'closed';
      }
      return 'done';
    }

    if (statusLabel) {
      const status = this.extractEnumFromLabel(statusLabel, 'status') ||
                     statusLabel.replace(/^status:\s*/, '');
      if (['new', 'in-progress', 'blocked', 'in-review', 'testing'].includes(status)) {
        return status as DevlogStatus;
      }
    }

    return 'new';
  }

  /**
   * Map devlog status to GitHub state and state_reason
   */
  private mapDevlogStatusToGitHubState(status: DevlogStatus): { state: 'open' | 'closed'; state_reason?: 'completed' | 'not_planned' | 'reopened' | null } {
    switch (status) {
      case 'done':
        return { state: 'closed', state_reason: 'completed' };
      case 'closed':
        return { state: 'closed', state_reason: 'not_planned' };
      case 'new':
      case 'in-progress':
      case 'blocked':
      case 'in-review':
      case 'testing':
      default:
        return { state: 'open', state_reason: null };
    }
  }

  /**
   * Map GitHub native type to devlog type (uses shared utility)
   */
  private mapGitHubTypeToDevlogType(githubType: string): DevlogType {
    return mapGitHubTypeToDevlogType(githubType);
  }

  /**
   * Map native GitHub labels to devlog type (uses shared utility)
   */
  private mapNativeLabelsToDevlogType(labels: string[]): DevlogType {
    return mapNativeLabelsToDevlogType(labels);
  }

  /**
   * Convert title to a valid devlog key
   */
  private titleToKey(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
