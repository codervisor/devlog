import {
  AdoConfig,
  DevlogEntry,
  DevlogPriority,
  DevlogType,
  EnterpriseIntegration,
  ExternalReference,
  GitHubConfig,
  JiraConfig,
} from '../types/index.js';

export class EnterpriseSync {
  private integrations?: EnterpriseIntegration;

  constructor(integrations?: EnterpriseIntegration) {
    this.integrations = integrations;
  }

  async syncWithJira(entry: DevlogEntry): Promise<ExternalReference> {
    if (!this.integrations?.jira) {
      throw new Error('Jira integration not configured');
    }

    const jiraConfig = this.integrations.jira;
    const jiraIssue = await this.createOrUpdateJiraIssue(entry, jiraConfig);

    return {
      system: 'jira',
      id: jiraIssue.key,
      url: `${jiraConfig.baseUrl}/browse/${jiraIssue.key}`,
      title: jiraIssue.fields.summary,
      status: jiraIssue.fields.status.name,
      lastSync: new Date().toISOString(),
    };
  }

  async syncWithADO(entry: DevlogEntry): Promise<ExternalReference> {
    if (!this.integrations?.ado) {
      throw new Error('Azure DevOps integration not configured');
    }

    const adoConfig = this.integrations.ado;
    const workItem = await this.createOrUpdateADOWorkItem(entry, adoConfig);

    return {
      system: 'ado',
      id: workItem.id.toString(),
      url: `https://dev.azure.com/${adoConfig.organization}/${adoConfig.project}/_workitems/edit/${workItem.id}`,
      title: workItem.fields['System.Title'],
      status: workItem.fields['System.State'],
      lastSync: new Date().toISOString(),
    };
  }

  async syncWithGitHub(entry: DevlogEntry): Promise<ExternalReference> {
    if (!this.integrations?.github) {
      throw new Error('GitHub integration not configured');
    }

    const githubConfig = this.integrations.github;
    const issue = await this.createOrUpdateGitHubIssue(entry, githubConfig);

    return {
      system: 'github',
      id: issue.number.toString(),
      url: issue.html_url,
      title: issue.title,
      status: issue.state,
      lastSync: new Date().toISOString(),
    };
  }

  async syncAll(entry: DevlogEntry): Promise<ExternalReference[]> {
    const syncPromises: Promise<ExternalReference>[] = [];

    if (this.integrations?.jira) {
      syncPromises.push(this.syncWithJira(entry));
    }

    if (this.integrations?.ado) {
      syncPromises.push(this.syncWithADO(entry));
    }

    if (this.integrations?.github) {
      syncPromises.push(this.syncWithGitHub(entry));
    }

    if (syncPromises.length === 0) {
      throw new Error('No integrations configured');
    }

    return Promise.all(syncPromises);
  }

  private async createOrUpdateJiraIssue(entry: DevlogEntry, config: JiraConfig): Promise<any> {
    const auth = Buffer.from(`${config.userEmail}:${config.apiToken}`).toString('base64');

    const issueData = {
      fields: {
        project: {
          key: config.projectKey,
        },
        summary: entry.title,
        description: this.formatDescriptionForJira(entry),
        issuetype: {
          name: this.mapDevlogTypeToJiraIssueType(entry.type),
        },
        priority: {
          name: this.mapDevlogPriorityToJiraPriority(entry.priority),
        },
      },
    };

    // Check if issue already exists
    const existingRef = entry.externalReferences?.find((ref) => ref.system === 'jira');

    if (existingRef) {
      // Update existing issue
      const response = await fetch(`${config.baseUrl}/rest/api/3/issue/${existingRef.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.statusText}`);
      }

      // Get updated issue
      const getResponse = await fetch(`${config.baseUrl}/rest/api/3/issue/${existingRef.id}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      return await getResponse.json();
    } else {
      // Create new issue
      const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.statusText}`);
      }

      const createdIssue = (await response.json()) as { key: string; id: string };

      // Get full issue details
      const getResponse = await fetch(`${config.baseUrl}/rest/api/3/issue/${createdIssue.key}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      return await getResponse.json();
    }
  }

  private async createOrUpdateADOWorkItem(entry: DevlogEntry, config: AdoConfig): Promise<any> {
    const auth = Buffer.from(`:${config.personalAccessToken}`).toString('base64');

    const workItemData = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: entry.title,
      },
      {
        op: 'add',
        path: '/fields/System.Description',
        value: this.formatDescriptionForADO(entry),
      },
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: this.mapDevlogPriorityToADOPriority(entry.priority),
      },
    ];

    // Check if work item already exists
    const existingRef = entry.externalReferences?.find((ref) => ref.system === 'ado');

    if (existingRef) {
      // Update existing work item
      const response = await fetch(
        `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems/${existingRef.id}?api-version=7.0`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify(workItemData),
        },
      );

      if (!response.ok) {
        throw new Error(`Azure DevOps API error: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Create new work item
      const workItemType = this.mapDevlogTypeToADOWorkItemType(entry.type);
      const response = await fetch(
        `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems/$${workItemType}?api-version=7.0`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify(workItemData),
        },
      );

      if (!response.ok) {
        throw new Error(`Azure DevOps API error: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  private async createOrUpdateGitHubIssue(entry: DevlogEntry, config: GitHubConfig): Promise<any> {
    const issueData = {
      title: entry.title,
      body: this.formatDescriptionForGitHub(entry),
      labels: this.mapDevlogToGitHubLabels(entry),
    };

    // Check if issue already exists
    const existingRef = entry.externalReferences?.find((ref) => ref.system === 'github');

    if (existingRef) {
      // Update existing issue
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${existingRef.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `token ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issueData),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Create new issue
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issueData),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  // Helper methods for mapping between devlog and external systems

  private formatDescriptionForJira(entry: DevlogEntry): string {
    let description = entry.description;

    if (entry.context?.businessContext) {
      description += `\n\n*Business Context:* ${entry.context.businessContext}`;
    }

    if (entry.context?.technicalContext) {
      description += `\n\n*Technical Context:* ${entry.context.technicalContext}`;
    }

    if (entry.context?.acceptanceCriteria && entry.context.acceptanceCriteria.length > 0) {
      description += `\n\n*Acceptance Criteria:*\n${entry.context.acceptanceCriteria.map((c) => `• ${c}`).join('\n')}`;
    }

    return description;
  }

  private formatDescriptionForADO(entry: DevlogEntry): string {
    let description = `<p>${entry.description}</p>`;

    if (entry.context?.businessContext) {
      description += `<p><strong>Business Context:</strong> ${entry.context.businessContext}</p>`;
    }

    if (entry.context?.technicalContext) {
      description += `<p><strong>Technical Context:</strong> ${entry.context.technicalContext}</p>`;
    }

    if (entry.context?.acceptanceCriteria && entry.context.acceptanceCriteria.length > 0) {
      description += `<p><strong>Acceptance Criteria:</strong></p><ul>${entry.context.acceptanceCriteria.map((c) => `<li>${c}</li>`).join('')}</ul>`;
    }

    return description;
  }

  private formatDescriptionForGitHub(entry: DevlogEntry): string {
    let description = entry.description;

    if (entry.context?.businessContext) {
      description += `\n\n## Business Context\n${entry.context.businessContext}`;
    }

    if (entry.context?.technicalContext) {
      description += `\n\n## Technical Context\n${entry.context.technicalContext}`;
    }

    if (entry.context?.acceptanceCriteria && entry.context.acceptanceCriteria.length > 0) {
      description += `\n\n## Acceptance Criteria\n${entry.context.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n')}`;
    }

    return description;
  }

  private mapDevlogTypeToJiraIssueType(type: DevlogType): string {
    const mapping = {
      feature: 'Story',
      bugfix: 'Bug',
      task: 'Task',
      refactor: 'Task',
      docs: 'Task',
    };
    return mapping[type] || 'Task';
  }

  private mapDevlogTypeToADOWorkItemType(type: DevlogType): string {
    const mapping = {
      feature: 'User Story',
      bugfix: 'Bug',
      task: 'Task',
      refactor: 'Task',
      docs: 'Task',
    };
    return mapping[type] || 'Task';
  }

  private mapDevlogPriorityToJiraPriority(priority: DevlogPriority): string {
    const mapping = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Highest',
    };
    return mapping[priority] || 'Medium';
  }

  private mapDevlogPriorityToADOPriority(priority: DevlogPriority): number {
    const mapping = {
      low: 4,
      medium: 3,
      high: 2,
      critical: 1,
    };
    return mapping[priority] || 3;
  }

  private mapDevlogToGitHubLabels(entry: DevlogEntry): string[] {
    const labels = [];

    // Add type label
    labels.push(entry.type);

    // Add priority label
    if (entry.priority === 'high' || entry.priority === 'critical') {
      labels.push('priority-high');
    }

    // Add status label if not new
    if (entry.status !== 'new') {
      labels.push(`status-${entry.status}`);
    }

    return labels;
  }
}
