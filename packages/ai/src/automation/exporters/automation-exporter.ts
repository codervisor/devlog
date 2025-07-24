/**
 * Automation Result Exporter
 *
 * Exports automation session results to various formats
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import type {
  AutomationSessionResult,
  TestScenarioResult,
  CopilotInteraction,
} from '../types/index.js';

export class AutomationResultExporter {
  /**
   * Export session results to JSON
   */
  async exportToJSON(sessionResult: AutomationSessionResult, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(sessionResult, null, 2);
    await writeFile(outputPath, jsonData, 'utf-8');
  }

  /**
   * Export session results to Markdown
   */
  async exportToMarkdown(
    sessionResult: AutomationSessionResult,
    outputPath: string,
  ): Promise<void> {
    const markdown = this.generateMarkdownReport(sessionResult);
    await writeFile(outputPath, markdown, 'utf-8');
  }

  /**
   * Export session results to CSV
   */
  async exportToCSV(sessionResult: AutomationSessionResult, outputPath: string): Promise<void> {
    const csv = this.generateCSVReport(sessionResult);
    await writeFile(outputPath, csv, 'utf-8');
  }

  /**
   * Export detailed analysis report
   */
  async exportDetailedReport(
    sessionResult: AutomationSessionResult,
    outputDir: string,
  ): Promise<void> {
    // Create summary report
    const summaryPath = join(outputDir, 'summary.md');
    await this.exportToMarkdown(sessionResult, summaryPath);

    // Create detailed JSON
    const detailsPath = join(outputDir, 'details.json');
    await this.exportToJSON(sessionResult, detailsPath);

    // Create CSV for data analysis
    const csvPath = join(outputDir, 'interactions.csv');
    await this.exportToCSV(sessionResult, csvPath);

    // Create individual scenario reports
    for (const scenario of sessionResult.scenarios) {
      const scenarioPath = join(outputDir, `scenario-${scenario.scenarioId}.md`);
      const scenarioMarkdown = this.generateScenarioReport(scenario);
      await writeFile(scenarioPath, scenarioMarkdown, 'utf-8');
    }
  }

  /**
   * Generate Markdown report from session results
   */
  private generateMarkdownReport(sessionResult: AutomationSessionResult): string {
    const duration = sessionResult.endTime.getTime() - sessionResult.startTime.getTime();
    const durationMinutes = Math.round(duration / 60000);

    let markdown = `# GitHub Copilot Automation Report

## Session Overview

- **Session ID**: ${sessionResult.sessionId}
- **Start Time**: ${sessionResult.startTime.toISOString()}
- **End Time**: ${sessionResult.endTime.toISOString()}
- **Duration**: ${durationMinutes} minutes
- **Container Status**: ${sessionResult.containerInfo.status}

## Summary Statistics

- **Total Scenarios**: ${sessionResult.summary.totalScenarios}
- **Successful**: ${sessionResult.summary.successfulScenarios}
- **Failed**: ${sessionResult.summary.failedScenarios}
- **Success Rate**: ${(sessionResult.summary.overallSuccessRate * 100).toFixed(1)}%
- **Total Interactions**: ${sessionResult.summary.totalInteractions}

## Scenario Results

`;

    for (const scenario of sessionResult.scenarios) {
      markdown += this.generateScenarioSection(scenario);
    }

    markdown += this.generateInteractionAnalysis(sessionResult);
    markdown += this.generateRecommendations(sessionResult);

    return markdown;
  }

  /**
   * Generate scenario section for Markdown report
   */
  private generateScenarioSection(scenario: TestScenarioResult): string {
    const duration = scenario.endTime.getTime() - scenario.startTime.getTime();
    const status = scenario.success ? '✅ Success' : '❌ Failed';

    let section = `### ${scenario.scenarioId} ${status}

- **Duration**: ${Math.round(duration / 1000)}s
- **Interactions**: ${scenario.interactions.length}
- **Suggestions**: ${scenario.metrics.totalSuggestions}
- **Accepted**: ${scenario.metrics.acceptedSuggestions}
- **Acceptance Rate**: ${scenario.metrics.totalSuggestions > 0 ? ((scenario.metrics.acceptedSuggestions / scenario.metrics.totalSuggestions) * 100).toFixed(1) : 0}%

`;

    if (scenario.error) {
      section += `**Error**: ${scenario.error}\n\n`;
    }

    if (scenario.generatedCode) {
      section += `**Generated Code**:
\`\`\`
${scenario.generatedCode}
\`\`\`

`;
    }

    return section;
  }

  /**
   * Generate interaction analysis section
   */
  private generateInteractionAnalysis(sessionResult: AutomationSessionResult): string {
    const allInteractions = sessionResult.scenarios.flatMap((s) => s.interactions);

    if (allInteractions.length === 0) {
      return '## Interaction Analysis\n\nNo interactions recorded.\n\n';
    }

    const triggerCounts = allInteractions.reduce(
      (acc, interaction) => {
        acc[interaction.trigger] = (acc[interaction.trigger] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgResponseTime = allInteractions
      .map((i) => i.metadata?.responseTime as number)
      .filter((t) => typeof t === 'number')
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

    let section = `## Interaction Analysis

### Trigger Distribution
`;

    for (const [trigger, count] of Object.entries(triggerCounts)) {
      const percentage = ((count / allInteractions.length) * 100).toFixed(1);
      section += `- **${trigger}**: ${count} (${percentage}%)\n`;
    }

    if (avgResponseTime > 0) {
      section += `\n### Performance
- **Average Response Time**: ${avgResponseTime.toFixed(0)}ms\n`;
    }

    return section + '\n';
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(sessionResult: AutomationSessionResult): string {
    const recommendations: string[] = [];

    if (sessionResult.summary.overallSuccessRate < 0.8) {
      recommendations.push('Consider reviewing failed scenarios for common patterns');
    }

    if (sessionResult.summary.totalInteractions === 0) {
      recommendations.push('No interactions detected - check capture configuration');
    }

    const avgInteractionsPerScenario =
      sessionResult.summary.totalInteractions / sessionResult.summary.totalScenarios;
    if (avgInteractionsPerScenario < 3) {
      recommendations.push('Low interaction count - scenarios may need more complexity');
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics look good - consider expanding test coverage');
    }

    let section = '## Recommendations\n\n';
    recommendations.forEach((rec, index) => {
      section += `${index + 1}. ${rec}\n`;
    });

    return section + '\n';
  }

  /**
   * Generate individual scenario report
   */
  private generateScenarioReport(scenario: TestScenarioResult): string {
    const duration = scenario.endTime.getTime() - scenario.startTime.getTime();
    const status = scenario.success ? 'Success' : 'Failed';

    let report = `# Scenario Report: ${scenario.scenarioId}

## Overview
- **Status**: ${status}
- **Duration**: ${Math.round(duration / 1000)} seconds
- **Start Time**: ${scenario.startTime.toISOString()}
- **End Time**: ${scenario.endTime.toISOString()}

## Metrics
- **Total Suggestions**: ${scenario.metrics.totalSuggestions}
- **Accepted Suggestions**: ${scenario.metrics.acceptedSuggestions}
- **Rejected Suggestions**: ${scenario.metrics.rejectedSuggestions}
- **Average Response Time**: ${scenario.metrics.averageResponseTime.toFixed(0)}ms

`;

    if (scenario.error) {
      report += `## Error
\`\`\`
${scenario.error}
\`\`\`

`;
    }

    if (scenario.generatedCode) {
      report += `## Generated Code
\`\`\`
${scenario.generatedCode}
\`\`\`

`;
    }

    if (scenario.interactions.length > 0) {
      report += '## Interactions\n\n';
      scenario.interactions.forEach((interaction, index) => {
        report += `### Interaction ${index + 1}
- **Timestamp**: ${interaction.timestamp.toISOString()}
- **Trigger**: ${interaction.trigger}
- **File**: ${interaction.context.fileName}
- **Position**: Line ${interaction.context.cursorPosition.line}, Column ${interaction.context.cursorPosition.character}

`;
        if (interaction.suggestion) {
          report += `**Suggestion**: ${interaction.suggestion.accepted ? 'Accepted' : 'Rejected'}
\`\`\`
${interaction.suggestion.text}
\`\`\`

`;
        }
      });
    }

    return report;
  }

  /**
   * Generate CSV report for data analysis
   */
  private generateCSVReport(sessionResult: AutomationSessionResult): string {
    const headers = [
      'Session ID',
      'Scenario ID',
      'Success',
      'Duration (ms)',
      'Total Suggestions',
      'Accepted Suggestions',
      'Rejection Rate',
      'Average Response Time',
      'Interaction Count',
      'Error',
    ];

    let csv = headers.join(',') + '\n';

    for (const scenario of sessionResult.scenarios) {
      const duration = scenario.endTime.getTime() - scenario.startTime.getTime();
      const rejectionRate =
        scenario.metrics.totalSuggestions > 0
          ? (
              (scenario.metrics.rejectedSuggestions / scenario.metrics.totalSuggestions) *
              100
            ).toFixed(1)
          : '0';

      const row = [
        sessionResult.sessionId,
        scenario.scenarioId,
        scenario.success,
        duration,
        scenario.metrics.totalSuggestions,
        scenario.metrics.acceptedSuggestions,
        rejectionRate,
        scenario.metrics.averageResponseTime.toFixed(1),
        scenario.interactions.length,
        scenario.error ? `"${scenario.error.replace(/"/g, '""')}"` : '',
      ];

      csv += row.join(',') + '\n';
    }

    return csv;
  }
}
