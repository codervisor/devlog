#!/usr/bin/env node

/**
 * DevLog CLI - Main Entry Point
 *
 * Command-line interface for streaming chat history to devlog server
 * and managing devlog projects.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import ProgressBar from 'progress';
import {
  ChatStatistics,
  CopilotParser,
  SearchResult,
  WorkspaceDataContainer,
} from '@codervisor/devlog-ai';
import { DevlogApiClient, ChatImportRequest } from './api/devlog-api-client.js';
import {
  validateConvertedData,
  convertWorkspaceDataToCoreFormat,
  extractWorkspaceInfo,
} from './utils/data-mapper.js';
import {
  displayError,
  displayHeader,
  displayInfo,
  displaySuccess,
  displayWarning,
  formatCount,
} from './utils/display.js';
import { loadConfig, ConfigOptions } from './utils/config.js';

// CLI option interfaces for better type safety
interface BaseCommandOptions {
  server?: string;
  project?: string;
  verbose: boolean;
  config?: string;
}

interface ChatImportOptions extends BaseCommandOptions {
  source: string;
  autoLink: boolean;
  threshold: string;
  dryRun: boolean;
}

interface SearchCommandOptions extends BaseCommandOptions {
  limit: string;
  caseSensitive: boolean;
  searchType: 'exact' | 'fuzzy' | 'semantic';
}

const program = new Command();

program
  .name('devlog')
  .description('DevLog CLI - Stream chat history and manage devlog projects')
  .version('0.1.0')
  .option('-s, --server <url>', 'DevLog server URL')
  .option('-w, --project <id>', 'Project ID')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Show detailed progress', false);

// Configuration setup
async function setupApiClient(options: BaseCommandOptions): Promise<DevlogApiClient> {
  const config = await loadConfig(options.config);

  const serverUrl = options.server || config.server || process.env.DEVLOG_SERVER;
  if (!serverUrl) {
    displayError(
      'configuration',
      'Server URL is required. Use --server, DEVLOG_SERVER env var, or config file.',
    );
    process.exit(1);
  }

  return new DevlogApiClient({
    baseURL: serverUrl,
    timeout: config.timeout || 30000,
    retries: config.retries || 3,
  });
}

function getProjectId(options: BaseCommandOptions, config: ConfigOptions): string {
  const projectId = options.project || process.env.DEVLOG_PROJECT;
  if (!projectId) {
    displayError(
      'configuration',
      'Project ID is required. Use --project, DEVLOG_PROJECT env var, or config file.',
    );
    process.exit(1);
  }
  return projectId;
}

// Chat import command
program
  .command('chat')
  .description('Chat history management commands')
  .addCommand(
    new Command('import')
      .description('Import chat history from local sources to devlog server')
      .option(
        '-s, --source <source>',
        'Chat source (github-copilot, cursor, claude)',
        'github-copilot',
      )
      .option('--auto-link', 'Automatically link chat sessions to devlog entries', true)
      .option('--threshold <number>', 'Auto-linking confidence threshold', '0.8')
      .option('--dry-run', 'Show what would be imported without actually importing', false)
      .action(async (options: ChatImportOptions) => {
        const spinner = options.verbose ? ora('Connecting to devlog server...').start() : null;

        try {
          const config = await loadConfig(options.config);
          const apiClient = await setupApiClient(options);
          const projectId = getProjectId(options, config);

          // Test connection first
          spinner && (spinner.text = 'Testing server connection...');
          const connected = await apiClient.testConnection();
          if (!connected) {
            throw new Error('Could not connect to devlog server. Make sure it is running.');
          }

          spinner && (spinner.text = 'Discovering local chat data...');

          // For now, only support GitHub Copilot
          if (options.source !== 'github-copilot') {
            throw new Error(
              `Source '${options.source}' not yet supported. Only 'github-copilot' is available.`,
            );
          }

          const parser = new CopilotParser();
          const projectData = await parser.discoverVSCodeCopilotData();

          if (projectData.chat_sessions.length === 0) {
            spinner?.stop();
            displayError('discovery', 'No GitHub Copilot chat data found');
            displayWarning('Make sure VS Code is installed and you have used GitHub Copilot chat');
            process.exit(1);
          }

          spinner?.stop();
          displaySuccess(`Found ${formatCount(projectData.chat_sessions.length)} chat sessions`);

          // Show dry run information
          if (options.dryRun) {
            const stats = parser.getChatStatistics(projectData);
            displayInfo('DRY RUN - No data will be imported');
            displayChatSummary(stats, [], options.verbose);
            return;
          }

          // Convert AI package data to Core package format
          const convertedData = convertWorkspaceDataToCoreFormat(
            projectData as WorkspaceDataContainer,
          );

          // Validate the converted data
          if (!validateConvertedData(convertedData)) {
            throw new Error(
              'Data conversion failed validation. Please check the chat data format.',
            );
          }

          // Prepare data for API
          const importData: ChatImportRequest = {
            sessions: convertedData.sessions,
            messages: convertedData.messages,
            source: options.source,
            workspaceInfo: extractWorkspaceInfo(projectData as WorkspaceDataContainer),
          };

          // Start import
          displayInfo(`Importing to project: ${projectId}`);
          const progressSpinner = ora('Starting import...').start();

          const importResponse = await apiClient.importChatData(projectId, importData);

          progressSpinner.stop();
          displaySuccess(`Import started: ${importResponse.importId}`);

          // Track progress
          const progressBar = new ProgressBar('Importing [:bar] :current/:total :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total:
              importResponse.progress.progress.totalSessions +
              importResponse.progress.progress.totalMessages,
          });

          // Poll for progress
          let lastProgress = importResponse.progress;
          while (lastProgress.status === 'pending' || lastProgress.status === 'processing') {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const progressResponse = await apiClient.getImportProgress(
              projectId,
              importResponse.importId,
            );
            lastProgress = progressResponse.progress;

            const current =
              lastProgress.progress.sessionsProcessed + lastProgress.progress.messagesProcessed;
            progressBar.update(current / progressBar.total);
          }

          progressBar.terminate();

          if (lastProgress.status === 'completed') {
            displaySuccess(`Import completed successfully!`);
            displayInfo(
              `Sessions: ${lastProgress.progress.sessionsProcessed}/${lastProgress.progress.totalSessions}`,
            );
            displayInfo(
              `Messages: ${lastProgress.progress.messagesProcessed}/${lastProgress.progress.totalMessages}`,
            );
          } else {
            displayError('import', lastProgress.error || 'Import failed');
            process.exit(1);
          }
        } catch (error) {
          spinner?.stop();
          if (options.verbose) {
            console.error(error);
          } else {
            displayError('importing chat data', error);
          }
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('stats')
      .description('Show chat statistics from devlog server')
      .action(async (options: BaseCommandOptions) => {
        try {
          const config = await loadConfig(options.config);
          const apiClient = await setupApiClient(options);
          const projectId = getProjectId(options, config);

          const stats = await apiClient.getChatStats(projectId);

          displayHeader('DevLog Chat Statistics');

          const table = new Table({
            head: [chalk.cyan('Metric'), chalk.green('Value')],
            colWidths: [25, 30],
          });

          table.push(
            ['Total Sessions', stats.totalSessions?.toString() || '0'],
            ['Total Messages', stats.totalMessages?.toString() || '0'],
            ['Unique Agents', stats.uniqueAgents?.toString() || '0'],
            ['Projects', stats.projectCount?.toString() || '0'],
          );

          if (stats.dateRange?.earliest) {
            table.push(['Date Range', `${stats.dateRange.earliest} to ${stats.dateRange.latest}`]);
          }

          console.log(table.toString());

          // Show additional details if available
          if (stats.agentBreakdown && Object.keys(stats.agentBreakdown).length > 0) {
            console.log(chalk.bold.blue('\nBy AI Agent:'));
            for (const [agent, count] of Object.entries(stats.agentBreakdown)) {
              console.log(`  • ${agent}: ${count}`);
            }
          }
        } catch (error) {
          displayError('getting statistics', error);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('search')
      .argument('<query>', 'Search query')
      .description('Search chat content on devlog server')
      .option('-l, --limit <number>', 'Maximum results to show', '10')
      .option('-c, --case-sensitive', 'Case sensitive search', false)
      .option('-t, --search-type <type>', 'Search type (exact, fuzzy, semantic)', 'exact')
      .action(async (query: string, options: SearchCommandOptions) => {
        try {
          const config = await loadConfig(options.config);
          const apiClient = await setupApiClient(options);
          const projectId = getProjectId(options, config);

          const searchResults = await apiClient.searchChatContent(projectId, query, {
            limit: parseInt(options.limit, 10),
            caseSensitive: options.caseSensitive,
            searchType: options.searchType,
          });

          if (!searchResults.results || searchResults.results.length === 0) {
            console.log(chalk.yellow(`No matches found for '${query}'`));
            return;
          }

          console.log(chalk.green(`Found ${searchResults.results.length} matches for '${query}'`));

          // Display results
          for (let i = 0; i < searchResults.results.length; i++) {
            const result = searchResults.results[i];
            console.log(chalk.bold.blue(`\nMatch ${i + 1}:`));
            console.log(`  Session: ${result.sessionId || 'Unknown'}`);
            console.log(`  Agent: ${result.agent || 'Unknown'}`);
            console.log(`  Role: ${result.role || 'Unknown'}`);
            if (result.highlightedContent) {
              console.log(`  Content: ${result.highlightedContent.slice(0, 200)}...`);
            }
          }
        } catch (error) {
          displayError('searching', error);
          process.exit(1);
        }
      }),
  );

// Project management commands
program
  .command('project')
  .description('Project management commands')
  .addCommand(
    new Command('list')
      .description('List available projects on server')
      .action(async (options: BaseCommandOptions) => {
        try {
          const apiClient = await setupApiClient(options);
          const projects = await apiClient.listProjects();

          if (projects.length === 0) {
            console.log(chalk.yellow('No projects found'));
            return;
          }

          displayHeader('Available Projects');

          const table = new Table({
            head: [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Status')],
            colWidths: [20, 30, 15],
          });

          for (const project of projects) {
            table.push([
              project.id || 'N/A',
              project.name || 'Unnamed',
              project.status || 'active',
            ]);
          }

          console.log(table.toString());
        } catch (error) {
          displayError('listing projects', error);
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('info')
      .description('Show project information')
      .action(async (options: BaseCommandOptions) => {
        try {
          const config = await loadConfig(options.config);
          const apiClient = await setupApiClient(options);
          const projectId = getProjectId(options, config);

          const project = await apiClient.getProject(projectId);

          displayHeader(`Project: ${project.name || projectId}`);

          const table = new Table({
            head: [chalk.cyan('Property'), chalk.green('Value')],
            colWidths: [20, 50],
          });

          table.push(
            ['ID', project.id || 'N/A'],
            ['Name', project.name || 'Unnamed'],
            ['Status', project.status || 'active'],
            ['Created', project.createdAt ? new Date(project.createdAt).toLocaleString() : 'N/A'],
            ['Updated', project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'N/A'],
          );

          console.log(table.toString());
        } catch (error) {
          displayError('getting project info', error);
          process.exit(1);
        }
      }),
  );

// Automation command - delegate to dedicated automation CLI
program
  .command('automation')
  .description('AI automation testing (Docker-based)')
  .action(async () => {
    try {
      // Dynamically import and run the automation CLI
      const { runAutomationCLI } = await import('./automation.js');
      await runAutomationCLI();
    } catch (error) {
      console.error(
        chalk.red('Automation feature not available:'),
        error instanceof Error ? error.message : String(error),
      );
      console.log(chalk.gray('Make sure Docker is installed and running for automation features.'));
      process.exit(1);
    }
  });

// Dev environment command
program
  .command('dev')
  .description('Manage local development environment')
  .action(async () => {
    try {
      const { runDevCLI } = await import('./dev.js');
      await runDevCLI();
    } catch (error) {
      console.error(
        chalk.red('Dev command failed:'),
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

// Helper function to display chat summary
function displayChatSummary(
  stats: ChatStatistics,
  searchResults: SearchResult[] = [],
  verbose: boolean = false,
): void {
  console.log(chalk.bold.blue('\n📊 Chat History Summary'));
  console.log(`Sessions: ${stats.total_sessions}`);
  console.log(`Messages: ${stats.total_messages}`);

  if (stats.date_range.earliest) {
    console.log(`Date range: ${stats.date_range.earliest} to ${stats.date_range.latest}`);
  }

  if (verbose && Object.keys(stats.session_types).length > 0) {
    console.log(chalk.bold('\nSession types:'));
    for (const [sessionType, count] of Object.entries(stats.session_types)) {
      console.log(`  ${sessionType}: ${count}`);
    }
  }

  if (verbose && Object.keys(stats.message_types).length > 0) {
    console.log(chalk.bold('\nMessage types:'));
    for (const [msgType, count] of Object.entries(stats.message_types)) {
      console.log(`  ${msgType}: ${count}`);
    }
  }

  if (searchResults.length > 0) {
    console.log(chalk.green(`\nSearch found ${searchResults.length} matches`));
  }
}

// Parse and execute
program.parse();
