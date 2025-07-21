/**
 * GitHub Mapper with HTML-First Content Structure
 *
 * This mapper uses <details> tags as native content sections instead of brittle JSON metadata.
 * Key benefits:
 * - Robust HTML parsing using Cheerio for reliable extraction
 * - User-friendly editable content sections
 * - GitHub-native rendering with collapsible sections
 * - Clear version control diffs
 * - No metadata corruption issues
 */

import {
  DevlogEntry,
  DevlogStatus,
  DevlogType,
  DevlogPriority,
  DevlogNote,
  Decision,
  GitHubStorageConfig,
  ExternalReference,
} from '../types/index.js';
import { GitHubIssue, CreateIssueRequest, UpdateIssueRequest } from './github-api.js';
import * as cheerio from 'cheerio';
import { mapGitHubTypeToDevlogType, mapNativeLabelsToDevlogType } from './github-type-mapper.js';

// Content section definitions
interface ContentSection {
  fieldPath: string; // e.g., 'context.businessContext', 'aiContext.currentSummary'
  summaryText: string;
  isOpen?: boolean; // Whether section should be open by default
  formatter?: (content: any) => string;
  parser?: (html: string) => any;
}

interface ParseOptions {
  enableFallback?: boolean; // Default: true
  preserveUnknownSections?: boolean; // Default: true
}

export class DevlogGitHubMapper {
  private config: Required<GitHubStorageConfig>;

  // Define content sections mapping
  private contentSections: ContentSection[] = [
    {
      fieldPath: 'context.businessContext',
      summaryText: 'Business Context',
      isOpen: true,
    },
    {
      fieldPath: 'context.technicalContext',
      summaryText: 'Technical Context',
      isOpen: true,
    },
    {
      fieldPath: 'context.acceptanceCriteria',
      summaryText: 'Acceptance Criteria',
      isOpen: false,
      formatter: (criteria: string[]) => criteria.map((c) => `- [ ] ${c}`).join('\n'),
      parser: (html: string) => this.parseCheckboxList(html),
    },
    {
      fieldPath: 'aiContext',
      summaryText: 'AI Context',
      isOpen: false,
      formatter: (aiContext: any) => this.formatAIContext(aiContext),
      parser: (html: string) => this.parseAIContext(html),
    },
    // NOTE: DevlogNotes are handled via GitHub Issue comments, not embedded in issue body
    {
      fieldPath: 'context.decisions',
      summaryText: 'Decisions',
      isOpen: false,
      formatter: (decisions: Decision[]) => this.formatDecisions(decisions),
      parser: (html: string) => this.parseDecisions(html),
    },
    {
      fieldPath: 'files',
      summaryText: 'Related Files',
      isOpen: false,
      formatter: (files: string[]) => files.map((f) => `- \`${f}\``).join('\n'),
      parser: (html: string) => this.parseFileList(html),
    },
  ];

  constructor(config: Required<GitHubStorageConfig>) {
    this.config = config;
  }

  /**
   * Parse GitHub Issue to DevlogEntry using HTML content sections
   */
  issueToDevlog(issue: GitHubIssue, options: ParseOptions = {}): DevlogEntry {
    // Parse HTML content sections
    const parsedContent = this.parseHTMLContentSections(issue.body || '');

    // Extract core fields from GitHub Issue metadata
    const coreEntry = this.extractCoreFields(issue);

    // Merge HTML content with core fields
    return this.mergeContentWithCore(coreEntry, parsedContent);
  }

  /**
   * Convert DevlogEntry to GitHub Issue with HTML content sections
   */
  devlogToIssue(entry: DevlogEntry): CreateIssueRequest | UpdateIssueRequest {
    const body = this.formatHTMLContentSections(entry);
    const labels = this.generateLabels(entry);

    const issueData: CreateIssueRequest | UpdateIssueRequest = {
      title: entry.title,
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
   * Parse HTML content sections from issue body using Cheerio
   */
  private parseHTMLContentSections(body: string): Partial<DevlogEntry> {
    const result: any = {};
    const $ = cheerio.load(body);

    // Extract main description (content before first <details> tag)
    const bodyText = $.root().html() || '';
    const firstDetailsIndex = bodyText.indexOf('<details');
    const formatMarkerIndex = bodyText.indexOf('<!-- DEVLOG_HTML_FORMAT_V1 -->');

    if (firstDetailsIndex !== -1) {
      let descriptionEnd = firstDetailsIndex;
      if (formatMarkerIndex !== -1 && formatMarkerIndex < firstDetailsIndex) {
        descriptionEnd = formatMarkerIndex;
      }

      const descriptionHTML = bodyText.substring(0, descriptionEnd);
      const description = cheerio
        .load(descriptionHTML)
        .text()
        .replace(/^##?\s*description\s*$/im, '') // Remove description header if present
        .trim();

      if (description) {
        result.description = description;
      }
    }

    // Parse each content section using Cheerio selectors
    for (const section of this.contentSections) {
      const content = this.extractDetailsContentWithCheerio($, section.summaryText);
      if (content) {
        const value = section.parser ? section.parser(content) : content;
        this.setNestedProperty(result, section.fieldPath, value);
      }
    }

    return result;
  }

  /**
   * Extract content from a specific details section using Cheerio
   */
  private extractDetailsContentWithCheerio(
    $: cheerio.CheerioAPI,
    summaryText: string,
  ): string | null {
    // Find the details element that contains a summary with the specified text
    const detailsElement = $('details')
      .filter((_, element) => {
        const summaryElement = $(element).find('summary').first();
        return summaryElement.text().trim() === summaryText;
      })
      .first();

    if (detailsElement.length === 0) {
      return null;
    }

    // Clone the details element to avoid modifying the original DOM
    const clonedDetails = detailsElement.clone();
    
    // Remove the summary element from the cloned content
    clonedDetails.find('summary').remove();
    
    // Get just the text content, preserving line breaks
    const textContent = clonedDetails.text().trim();
    
    return textContent || null;
  }

  /**
   * Format DevlogEntry as HTML content sections
   */
  private formatHTMLContentSections(entry: DevlogEntry): string {
    let body = '';

    // Add main description
    if (entry.description) {
      body += `## Description\n\n${entry.description}\n\n`;
    }

    // Add content sections
    for (const section of this.contentSections) {
      const value = this.getNestedProperty(entry, section.fieldPath);
      if (value) {
        const content = section.formatter ? section.formatter(value) : String(value);
        if (content && content.trim()) {
          const openAttr = section.isOpen ? ' open' : '';
          body += `<details${openAttr}>\n`;
          body += `<summary>${section.summaryText}</summary>\n\n`;
          body += `${content}\n\n`;
          body += `</details>\n\n`;
        }
      }
    }

    // Add format version marker
    body += `<!-- DEVLOG_HTML_FORMAT_V1 -->\n`;

    return body;
  }

  /**
   * Parse checkbox list from HTML content
   */
  private parseCheckboxList(html: string): string[] {
    const lines = html.split('\n');
    return lines
      .filter((line) => line.trim().match(/^-\s*\[[x\s]\]|^-\s+|^\*\s+|\d+\.\s+/))
      .map((line) => line.replace(/^-\s*\[[x\s]\]\s*|^[-*]\s*|\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Parse AI context from formatted HTML
   */
  private parseAIContext(html: string): any {
    const aiContext: any = {};

    // Extract current summary
    const summaryMatch = html.match(/\*\*Current Summary:\*\*\s*(.*?)(?=\n|$)/i);
    if (summaryMatch) {
      aiContext.currentSummary = summaryMatch[1].trim();
    }

    // Extract key insights
    const insightsMatch = html.match(/\*\*Key Insights:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    if (insightsMatch) {
      aiContext.keyInsights = this.parseListItems(insightsMatch[1]);
    }

    // Extract open questions
    const questionsMatch = html.match(/\*\*Open Questions:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    if (questionsMatch) {
      aiContext.openQuestions = this.parseListItems(questionsMatch[1]);
    }

    // Extract suggested next steps
    const stepsMatch = html.match(/\*\*Suggested Next Steps:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    if (stepsMatch) {
      aiContext.suggestedNextSteps = this.parseListItems(stepsMatch[1]);
    }

    return aiContext;
  }

  /**
   * Format AI context as structured HTML
   */
  private formatAIContext(aiContext: any): string {
    let content = '';

    if (aiContext.currentSummary) {
      content += `**Current Summary:** ${aiContext.currentSummary}\n\n`;
    }

    if (aiContext.keyInsights?.length > 0) {
      content += `**Key Insights:**\n${aiContext.keyInsights.map((i: string) => `- ${i}`).join('\n')}\n\n`;
    }

    if (aiContext.openQuestions?.length > 0) {
      content += `**Open Questions:**\n${aiContext.openQuestions.map((q: string) => `- ${q}`).join('\n')}\n\n`;
    }

    if (aiContext.suggestedNextSteps?.length > 0) {
      content += `**Suggested Next Steps:**\n${aiContext.suggestedNextSteps.map((s: string) => `- ${s}`).join('\n')}\n\n`;
    }

    return content.trim();
  }

  /**
   * Parse decisions from HTML content
   */
  private parseDecisions(html: string): Decision[] {
    // Simplified parsing - you can enhance this based on your decision format
    const decisions: Decision[] = [];
    const decisionBlocks = html.split(/(?=\*\*Decision:)/);

    for (const block of decisionBlocks) {
      if (!block.includes('**Decision:')) continue;

      const decisionMatch = block.match(/\*\*Decision:\*\*\s*(.*?)(?=\n|$)/);
      const rationaleMatch = block.match(/\*\*Rationale:\*\*\s*(.*?)(?=\n|$)/);

      if (decisionMatch) {
        decisions.push({
          id: crypto.randomUUID(),
          decision: decisionMatch[1].trim(),
          rationale: rationaleMatch ? rationaleMatch[1].trim() : '',
          decisionMaker: 'unknown',
          timestamp: new Date().toISOString(),
          alternatives: [],
        });
      }
    }

    return decisions;
  }

  /**
   * Format decisions as HTML
   */
  private formatDecisions(decisions: Decision[]): string {
    return decisions
      .map((decision) => {
        let content = `**Decision:** ${decision.decision}\n`;
        content += `**Rationale:** ${decision.rationale}\n`;
        content += `**Made by:** ${decision.decisionMaker}\n`;
        if (decision.alternatives && decision.alternatives.length > 0) {
          content += `**Alternatives considered:** ${decision.alternatives.join(', ')}\n`;
        }
        return content;
      })
      .join('\n\n');
  }

  /**
   * Parse file list from HTML
   */
  private parseFileList(html: string): string[] {
    const lines = html.split('\n');
    return lines
      .filter((line) => line.trim().match(/^-\s*`.*`|^-\s+\S|^\*\s+\S/))
      .map((line) => line.replace(/^[-*]\s*`?|`?$/g, '').trim())
      .filter((file) => file.length > 0);
  }

  /**
   * Parse list items from text
   */
  private parseListItems(text: string): string[] {
    return text
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Get nested property value using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested property value using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Merge parsed content with base entry
   */
  private mergeContentWithBase(
    baseEntry: DevlogEntry,
    parsedContent: Partial<DevlogEntry>,
  ): DevlogEntry {
    return {
      ...baseEntry,
      ...parsedContent,
      context: {
        ...baseEntry.context,
        ...parsedContent.context,
      },
      aiContext: {
        ...baseEntry.aiContext,
        ...parsedContent.aiContext,
      },
    };
  }

  /**
   * Extract core DevlogEntry fields from GitHub Issue metadata
   */
  private extractCoreFields(issue: GitHubIssue): Partial<DevlogEntry> {
    // Determine type - use native type field or fall back to labels
    let type: DevlogType = 'task';
    if (this.config.mapping.useNativeType && (issue as any).type) {
      type = mapGitHubTypeToDevlogType((issue as any).type);
    } else {
      // Extract devlog data from labels
      const typeLabel = issue.labels.find((l) =>
        l.name.startsWith(`${this.config.labelsPrefix}-type:`),
      );
      if (typeLabel) {
        type = (this.extractEnumFromLabel(typeLabel.name, 'type') as DevlogType) || 'task';
      } else if (this.config.mapping.useNativeLabels) {
        // Map from native GitHub labels
        type = mapNativeLabelsToDevlogType(issue.labels.map((l) => l.name));
      }
    }

    // Determine status - use state_reason or fall back to labels/state
    let status: DevlogStatus = 'new';
    if (this.config.mapping.useStateReason) {
      status = this.mapGitHubStateToDevlogStatus(issue.state, undefined, issue.state_reason);
    } else {
      const statusLabel = issue.labels.find(
        (l) =>
          l.name.startsWith(`${this.config.labelsPrefix}-status:`) || l.name.startsWith('status:'),
      );
      status = this.mapGitHubStateToDevlogStatus(issue.state, statusLabel?.name);
    }

    // Determine priority - from labels
    let priority: DevlogPriority = 'medium';
    const priorityLabel = issue.labels.find(
      (l) =>
        l.name.startsWith(`${this.config.labelsPrefix}-priority:`) ||
        l.name.startsWith('priority:'),
    );
    if (priorityLabel) {
      const extractedPriority =
        this.extractEnumFromLabel(priorityLabel.name, 'priority') ||
        priorityLabel.name.replace(/^priority:\s*/, '');
      if (['low', 'medium', 'high', 'critical'].includes(extractedPriority)) {
        priority = extractedPriority as DevlogPriority;
      }
    }

    return {
      id: issue.number,
      key: this.titleToKey(issue.title),
      title: issue.title,
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
   * Merge HTML parsed content with core DevlogEntry fields
   */
  private mergeContentWithCore(
    coreEntry: Partial<DevlogEntry>,
    parsedContent: Partial<DevlogEntry>,
  ): DevlogEntry {
    // Deep merge the parsed content with core entry
    const merged = { ...coreEntry };

    // Merge description
    if (parsedContent.description) {
      merged.description = parsedContent.description;
    }

    // Merge context
    if (parsedContent.context) {
      merged.context = {
        ...merged.context,
        ...parsedContent.context,
      };
    }

    // Merge AI context
    if (parsedContent.aiContext) {
      merged.aiContext = {
        ...merged.aiContext,
        ...parsedContent.aiContext,
      };
    }

    // Merge other fields
    Object.keys(parsedContent).forEach((key) => {
      if (key !== 'context' && key !== 'aiContext' && key !== 'description') {
        (merged as any)[key] = (parsedContent as any)[key];
      }
    });

    return merged as DevlogEntry;
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
      // Use custom prefixed labels
      if (!this.config.mapping.useNativeType) {
        labels.push(`${this.config.labelsPrefix}-type:${entry.type}`);
      }

      if (!this.config.mapping.useStateReason) {
        labels.push(`${this.config.labelsPrefix}-status:${entry.status}`);
      }

      labels.push(`${this.config.labelsPrefix}-priority:${entry.priority}`);
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
      const status =
        this.extractEnumFromLabel(statusLabel, 'status') || statusLabel.replace(/^status:\s*/, '');
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
   * Fallback to legacy parsing if no HTML sections found
   */
  private attemptLegacyParsing(issue: GitHubIssue, baseEntry: DevlogEntry): DevlogEntry {
    // Try the original base mapper parsing
    return baseEntry;
  }
}
