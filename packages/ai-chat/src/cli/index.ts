#!/usr/bin/env node

/**
 * Simplified CLI for AI Chat - Focus on AI Assistant Chat History
 * 
 * TypeScript implementation of the main entry point focusing on 
 * core chat history extraction functionality from various AI assistants.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { resolve } from 'path';
import { CopilotParser, ChatStatistics, SearchResult } from '../parsers/index.js';
import { JSONExporter, MarkdownExporter } from '../exporters/index.js';

// CLI option interfaces for better type safety
interface ChatCommandOptions {
  output?: string;
  format: 'json' | 'md';
  search?: string;
  verbose: boolean;
}

interface StatsCommandOptions {
  // No specific options for now, keeping for future expansion
}

interface SearchCommandOptions {
  limit: string;
  caseSensitive: boolean;
}

interface ExportData {
  chat_data: Record<string, unknown>;
  statistics: ChatStatistics;
  search_results?: SearchResult[];
}

const program = new Command();

program
  .name('ai-chat')
  .description('Extract and analyze AI assistant chat history')
  .version('0.1.0');

// Chat command
program
  .command('chat')
  .description('Extract and analyze AI assistant chat history')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format (json, md)', 'json')
  .option('-s, --search <query>', 'Search query for chat content')
  .option('-v, --verbose', 'Show detailed progress', false)
  .action(async (options: ChatCommandOptions) => {
    const spinner = options.verbose ? ora('Discovering GitHub Copilot chat data...').start() : null;
    
    try {
      const parser = new CopilotParser();
      
      if (options.verbose) {
        console.log(chalk.yellow('Discovering GitHub Copilot chat data...'));
      }
      
      const workspaceData = await parser.discoverVSCodeCopilotData();
      
      if (workspaceData.chat_sessions.length === 0) {
        spinner?.stop();
        console.log(chalk.red('No GitHub Copilot chat data found'));
        console.log(chalk.yellow('Make sure VS Code or VS Code Insiders is installed and you have used GitHub Copilot chat'));
        process.exit(1);
      }
      
      spinner?.stop();
      console.log(chalk.green(`Found ${workspaceData.chat_sessions.length} chat sessions`));
      
      // Get statistics
      const stats = parser.getChatStatistics(workspaceData);
      
      const result: ExportData = {
        chat_data: (workspaceData as any).toDict(),
        statistics: stats
      };
      
      // Search if query provided
      let searchResults: SearchResult[] = [];
      if (options.search) {
        searchResults = parser.searchChatContent(workspaceData, options.search);
        result.search_results = searchResults;
        console.log(chalk.green(`Found ${searchResults.length} matches for '${options.search}'`));
      }
      
      // Output results
      if (options.output) {
        const outputPath = resolve(options.output);
        
        if (options.format === 'json') {
          const exporter = new JSONExporter();
          await exporter.exportData(result, outputPath);
        } else if (options.format === 'md') {
          const exporter = new MarkdownExporter();
          // Convert ExportData to MarkdownExportData format
          const markdownData = {
            statistics: result.statistics,
            chat_data: { chat_sessions: (result.chat_data as any).chat_sessions },
            search_results: result.search_results
          };
          await exporter.exportChatData(markdownData, outputPath);
        } else {
          console.log(chalk.red(`Unsupported format: ${options.format}`));
          console.log(chalk.yellow('Supported formats: json, md'));
          process.exit(1);
        }
        
        console.log(chalk.green(`Chat data saved to ${outputPath}`));
      } else {
        // Print summary to console
        displayChatSummary(stats, searchResults, options.verbose);
      }
      
    } catch (error) {
      spinner?.stop();
      if (options.verbose) {
        console.error(error);
      } else {
        console.log(chalk.red(`Error extracting chat data: ${error instanceof Error ? error.message : String(error)}`));
      }
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show statistics about available chat data')
  .action(async () => {
    try {
      const parser = new CopilotParser();
      const workspaceData = await parser.discoverVSCodeCopilotData();
      
      if (workspaceData.chat_sessions.length === 0) {
        console.log(chalk.red('No chat sessions found'));
        return;
      }
      
      const stats = parser.getChatStatistics(workspaceData);
      
      // Display detailed statistics
      const table = new Table({
        head: [chalk.cyan('Metric'), chalk.green('Value')],
        colWidths: [20, 50]
      });
      
      table.push(
        ['Total Sessions', stats.total_sessions.toString()],
        ['Total Messages', stats.total_messages.toString()]
      );
      
      if (stats.date_range.earliest) {
        table.push(['Date Range', `${stats.date_range.earliest} to ${stats.date_range.latest}`]);
      }
      
      console.log(chalk.bold('GitHub Copilot Chat Statistics'));
      console.log(table.toString());
      
      // Session types
      if (Object.keys(stats.session_types).length > 0) {
        console.log(chalk.bold.blue('\nSession Types:'));
        for (const [sessionType, count] of Object.entries(stats.session_types)) {
          console.log(`  • ${sessionType}: ${count}`);
        }
      }
      
      // Message types
      if (Object.keys(stats.message_types).length > 0) {
        console.log(chalk.bold.blue('\nMessage Types:'));
        for (const [msgType, count] of Object.entries(stats.message_types)) {
          console.log(`  • ${msgType}: ${count}`);
        }
      }
      
      // Workspace activity
      if (Object.keys(stats.workspace_activity).length > 0) {
        console.log(chalk.bold.blue('\nWorkspace Activity:'));
        const sortedWorkspaces = Object.entries(stats.workspace_activity)
          .sort((a: [string, WorkspaceActivity], b: [string, WorkspaceActivity]) => b[1].sessions - a[1].sessions);
        
        for (const [workspace, activity] of sortedWorkspaces) {
          const workspaceName = workspace === 'unknown_workspace' ? 'Unknown' : workspace;
          console.log(`  • ${workspaceName}: ${activity.sessions} sessions, ${activity.messages} messages`);
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`Error getting statistics: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search for content in chat history')
  .option('-l, --limit <number>', 'Maximum results to show', '10')
  .option('-c, --case-sensitive', 'Case sensitive search', false)
  .action(async (query: string, options: SearchCommandOptions) => {
    try {
      const parser = new CopilotParser();
      const workspaceData = await parser.discoverVSCodeCopilotData();
      
      if (workspaceData.chat_sessions.length === 0) {
        console.log(chalk.red('No chat sessions found'));
        return;
      }
      
      const searchResults = parser.searchChatContent(workspaceData, query, options.caseSensitive);
      
      if (searchResults.length === 0) {
        console.log(chalk.yellow(`No matches found for '${query}'`));
        return;
      }
      
      console.log(chalk.green(`Found ${searchResults.length} matches for '${query}'`));
      
      // Display results
      const limit = parseInt(options.limit, 10);
      for (let i = 0; i < Math.min(searchResults.length, limit); i++) {
        const result = searchResults[i];
        console.log(chalk.bold.blue(`\nMatch ${i + 1}:`));
        console.log(`  Session: ${result.session_id}`);
        console.log(`  Role: ${result.role}`);
        console.log(`  Context: ${result.context.slice(0, 200)}...`);
      }
      
      if (searchResults.length > limit) {
        console.log(chalk.yellow(`\n... and ${searchResults.length - limit} more matches`));
      }
      
    } catch (error) {
      console.log(chalk.red(`Error searching: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

interface WorkspaceActivity {
  sessions: number;
  messages: number;
  first_seen: string;
  last_seen: string;
}

function displayChatSummary(stats: ChatStatistics, searchResults: SearchResult[] = [], verbose: boolean = false): void {
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
  
  if (verbose && Object.keys(stats.workspace_activity).length > 0) {
    console.log(chalk.bold('\nWorkspaces:'));
    const sortedWorkspaces = Object.entries(stats.workspace_activity)
      .sort((a: [string, WorkspaceActivity], b: [string, WorkspaceActivity]) => b[1].sessions - a[1].sessions)
      .slice(0, 5); // Show top 5 workspaces
    
    for (const [workspace, activity] of sortedWorkspaces) {
      const workspaceName = workspace === 'unknown_workspace' ? 'Unknown' : workspace;
      console.log(`  ${workspaceName}: ${activity.sessions} sessions, ${activity.messages} messages`);
    }
  }
  
  if (searchResults.length > 0) {
    console.log(chalk.green(`\nSearch found ${searchResults.length} matches`));
  }
}

// Parse and execute
program.parse();
