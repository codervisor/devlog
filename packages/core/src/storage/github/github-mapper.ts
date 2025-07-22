/**
 * GitHub Mapper with HTML Comments Metadata Structure
 *
 * This mapper uses hidden HTML comments with base64 encoded JSON metadata.
 * Key benefits:
 * - Robust metadata storage that's invisible to users
 * - No interference with user content (including HTML tags)
 * - Base64 encoding prevents corruption
 * - GitHub-native rendering for human-readable content
 * - Clear separation of metadata and display content
 */

import {
  DevlogEntry,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
  GitHubStorageConfig,
} from '@/types';
import { CreateIssueRequest, GitHubIssue, UpdateIssueRequest } from './github-api.js';
import { formatEnhancedGitHubTitle } from './emoji-mappings.js';
import { mapGitHubTypeToDevlogType } from './github-type-mapper.js';

// Metadata structure for HTML comments
interface DevlogMetadata {
  version: number;
  data: Partial<DevlogEntry>;
}

interface ParseOptions {
  enableFallback?: boolean; // Default: true
  preserveUnknownSections?: boolean; // Default: true
}

export class DevlogGitHubMapper {
  private config: Required<GitHubStorageConfig>;
  private readonly METADATA_VERSION = 1;

  constructor(config: Required<GitHubStorageConfig>) {
    this.config = config;
  }

  /**
   * Parse GitHub Issue to DevlogEntry using HTML comment metadata
   */
  issueToDevlog(issue: GitHubIssue, options: ParseOptions = {}): DevlogEntry {
    // Extract core fields from GitHub Issue metadata
    const coreEntry = this.extractCoreFields(issue);

    // Parse metadata from HTML comments
    const metadata = this.parseMetadataFromComments(issue.body || '');

    // Extract display content (everything except metadata comments)
    const displayContent = this.extractDisplayContent(issue.body || '');
    if (displayContent.trim()) {
      coreEntry.description = displayContent;
    }

    // Merge metadata with core fields
    return this.mergeMetadataWithCore(coreEntry, metadata);
  }

  /**
   * Convert DevlogEntry to GitHub Issue with HTML comment metadata
   */
  devlogToIssue(entry: DevlogEntry): CreateIssueRequest | UpdateIssueRequest {
    const body = this.formatIssueBodyWithMetadata(entry);
    const labels = this.generateLabels(entry);

    // Enhanced title with emoji icons
    const enhancedTitle = this.config.enableEmojiTitles
      ? formatEnhancedGitHubTitle(entry.title, entry.type, entry.status, entry.priority)
      : entry.title;

    const issueData: CreateIssueRequest | UpdateIssueRequest = {
      title: enhancedTitle,
      body,
      labels,
      assignees: entry.assignee ? [entry.assignee] : undefined,
    };

    // Use native type field if configured
    if (this.config.mapping.useNativeType) {
      (issueData as any).type = entry.type;
    }

    // Use state field if configured
    if (this.config.mapping.useStateReason) {
      const stateMapping = this.mapDevlogStatusToGitHubState(entry.status);
      (issueData as any).state = stateMapping.state;
      if (stateMapping.state_reason) {
        (issueData as any).state_reason = stateMapping.state_reason;
      }
    }

    return issueData;
  }

  /**
   * Parse metadata from HTML comments in issue body
   */
  private parseMetadataFromComments(body: string): Partial<DevlogEntry> {
    const metadataPattern = /<!--\s*DEVLOG_METADATA\s*:\s*([A-Za-z0-9+/=]+)\s*-->/g;
    let match;
    let metadata: Partial<DevlogEntry> = {};

    while ((match = metadataPattern.exec(body)) !== null) {
      try {
        const base64Data = match[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const parsedMetadata: DevlogMetadata = JSON.parse(jsonString);

        // Merge with existing metadata (later comments override earlier ones)
        metadata = { ...metadata, ...parsedMetadata.data };
      } catch (error) {
        console.warn('Failed to parse devlog metadata from HTML comment:', error);
      }
    }

    return metadata;
  }

  /**
   * Extract display content (everything except metadata comments)
   */
  private extractDisplayContent(body: string): string {
    // Remove metadata comments but keep all other content
    return body.replace(/<!--\s*DEVLOG_METADATA\s*:\s*[A-Za-z0-9+/=]+\s*-->/g, '').trim();
  }

  /**
   * Format issue body with metadata in HTML comments
   */
  private formatIssueBodyWithMetadata(entry: DevlogEntry): string {
    let body = '';

    // Add description if present
    if (entry.description) {
      body += `${entry.description}\n\n`;
    }

    // Create metadata object (exclude core fields that are already in GitHub Issue metadata)
    const metadata: DevlogMetadata = {
      version: this.METADATA_VERSION,
      data: {
        // Include context data
        context: entry.context,
        // Include AI context
        aiContext: entry.aiContext,
        // Include files
        files: entry.files,
        // Include related devlogs
        relatedDevlogs: entry.relatedDevlogs,
        // Include external references
        externalReferences: entry.externalReferences,
      },
    };

    // Encode metadata as base64 and add as HTML comment
    const jsonString = JSON.stringify(metadata);
    const base64Data = Buffer.from(jsonString, 'utf-8').toString('base64');
    body += `<!-- DEVLOG_METADATA: ${base64Data} -->\n`;

    return body;
  }

  /**
   * Merge metadata with core DevlogEntry fields
   */
  private mergeMetadataWithCore(
    coreEntry: Partial<DevlogEntry>,
    metadata: Partial<DevlogEntry>,
  ): DevlogEntry {
    // Deep merge the metadata with core entry
    const merged = { ...coreEntry };

    // Merge context
    if (metadata.context) {
      merged.context = {
        ...merged.context,
        ...metadata.context,
      };
    }

    // Merge AI context
    if (metadata.aiContext) {
      merged.aiContext = {
        ...merged.aiContext,
        ...metadata.aiContext,
      };
    }

    // Merge other fields from metadata
    Object.keys(metadata).forEach((key) => {
      if (key !== 'context' && key !== 'aiContext') {
        (merged as any)[key] = (metadata as any)[key];
      }
    });

    return merged as DevlogEntry;
  }

  /**
   * Extract core DevlogEntry fields from GitHub Issue metadata
   */
  private extractCoreFields(issue: GitHubIssue): Partial<DevlogEntry> {
    // Clean emoji from title if present
    const cleanTitle = this.cleanEmojiFromTitle(issue.title);

    // Check if this is a devlog-managed issue by looking for marker label
    const markerLabel = this.config.markerLabel || 'devlog';
    const isDevlogManaged = issue.labels.some((l) => l.name === markerLabel);

    if (!isDevlogManaged) {
      // This might not be a devlog-managed issue, but try to parse anyway
      console.warn(
        `Issue ${issue.number} does not have marker label '${markerLabel}' - may not be devlog-managed`,
      );
    }

    // Determine type - use native type field or fall back to labels
    let type: DevlogType = 'task';
    if (this.config.mapping.useNativeType && (issue as any).type) {
      type = mapGitHubTypeToDevlogType((issue as any).type);
    } else {
      // Look for native GitHub type labels
      const typeLabel = issue.labels.find((l) =>
        ['bug', 'enhancement', 'documentation', 'refactor', 'task'].includes(l.name),
      );
      if (typeLabel) {
        type = mapGitHubTypeToDevlogType(typeLabel.name);
      }
    }

    // Determine status - use state_reason or fall back to clean status labels
    let status: DevlogStatus = 'new';
    if (this.config.mapping.useStateReason) {
      status = this.mapGitHubStateToDevlogStatus(issue.state, undefined, issue.state_reason);
    } else {
      const statusLabel = issue.labels.find((l) => l.name.startsWith('status:'));
      if (statusLabel) {
        const statusValue = statusLabel.name.replace('status:', '');
        if (['new', 'in-progress', 'blocked', 'in-review', 'testing'].includes(statusValue)) {
          status = statusValue as DevlogStatus;
        }
      } else {
        // Fall back to GitHub state
        status = this.mapGitHubStateToDevlogStatus(issue.state);
      }
    }

    // Determine priority - from clean priority labels
    let priority: DevlogPriority = 'medium';
    const priorityLabel = issue.labels.find((l) => l.name.startsWith('priority:'));
    if (priorityLabel) {
      const priorityValue = priorityLabel.name.replace('priority:', '');
      if (['low', 'medium', 'high', 'critical'].includes(priorityValue)) {
        priority = priorityValue as DevlogPriority;
      }
    }

    return {
      id: issue.number,
      key: this.titleToKey(cleanTitle),
      title: cleanTitle,
      type,
      status,
      priority,
      assignee: issue.assignees[0]?.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
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
        suggestedNextSteps: [],
        openQuestions: [],
        relatedPatterns: [],
        lastAIUpdate: new Date().toISOString(),
        contextVersion: 1,
      },
      externalReferences: [],
    };
  }

  /**
   * Generate labels for the GitHub issue
   */
  private generateLabels(entry: DevlogEntry): string[] {
    const labels: string[] = [];
    const markerLabel = this.config.markerLabel || 'devlog';

    // Always add the marker label to identify devlog-managed issues
    labels.push(markerLabel);

    // Add type label - use native GitHub labels when possible
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
        labels.push('task');
        break;
      default:
        labels.push(entry.type);
    }

    // Add clean priority labels
    labels.push(`priority:${entry.priority}`);

    // Add clean status labels if not using GitHub's native state_reason
    if (!this.config.mapping.useStateReason) {
      labels.push(`status:${entry.status}`);
    }

    return labels;
  }

  /**
   * Map GitHub issue state and status label to devlog status
   */
  private mapGitHubStateToDevlogStatus(
    state: 'open' | 'closed',
    statusLabel?: string,
    stateReason?: 'completed' | 'not_planned' | 'reopened' | null,
  ): DevlogStatus {
    if (state === 'closed') {
      if (stateReason === 'not_planned') {
        return 'cancelled';
      }
      return 'done';
    }

    if (statusLabel) {
      // Handle clean status labels (status:value)
      const status = statusLabel.replace(/^status:\s*/, '');
      if (['new', 'in-progress', 'blocked', 'in-review', 'testing'].includes(status)) {
        return status as DevlogStatus;
      }
    }

    return 'new';
  }

  /**
   * Map devlog status to GitHub state and state_reason
   */
  private mapDevlogStatusToGitHubState(status: DevlogStatus): {
    state: 'open' | 'closed';
    state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
  } {
    switch (status) {
      case 'done':
        return { state: 'closed', state_reason: 'completed' };
      case 'cancelled':
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

  /**
   * Clean emoji prefixes from GitHub issue titles
   */
  private cleanEmojiFromTitle(title: string): string {
    // Remove common emoji patterns at the start of titles
    // This pattern matches emoji characters followed by optional spaces
    return title
      .replace(
        /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2300}-\u{23FF}\u{2B50}\u{25AA}-\u{25FE}\u{2139}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{231A}-\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2660}-\u{2668}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}]+\s*/gu,
        '',
      )
      .trim();
  }

  /**
   * Fallback to basic parsing if no metadata found
   */
  private attemptLegacyParsing(issue: GitHubIssue, baseEntry: DevlogEntry): DevlogEntry {
    // If no metadata found, treat the entire body as description
    if (issue.body && issue.body.trim()) {
      baseEntry.description = issue.body.trim();
    }
    return baseEntry;
  }
}
