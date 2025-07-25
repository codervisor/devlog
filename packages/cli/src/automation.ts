#!/usr/bin/env node

/**
 * DevLog Automation CLI
 *
 * Command-line interface for Docker-based AI automation testing
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  DockerCopilotAutomation,
  CodeGenerationScenario,
  ScenarioFactory,
  AutomationResultExporter,
} from '@devlog/ai';

const program = new Command();

program
  .name('devlog-automation')
  .description('Docker-based AI automation testing for DevLog')
  .version('0.1.0');

// Run automation command
program
  .command('run')
  .description('Run automated AI testing scenarios')
  .option('-t, --token <token>', 'GitHub token for Copilot authentication')
  .option('-l, --language <language>', 'Programming language filter')
  .option('-c, --category <category>', 'Scenario category filter')
  .option('-o, --output <path>', 'Output directory for results')
  .option('--port <port>', 'VS Code server port', '8080')
  .option('--timeout <ms>', 'Operation timeout in milliseconds', '60000')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    const spinner = ora('Starting automation session...').start();

    try {
      // Validate required options
      if (!options.token) {
        throw new Error('GitHub token is required. Use --token option.');
      }

      // Configure automation
      const config = {
        githubToken: options.token,
        ports: { codeServer: parseInt(options.port), vscode: 3000 },
        timeout: parseInt(options.timeout),
        debug: options.debug || false,
      };

      // Get scenarios
      const scenarios = ScenarioFactory.getFilteredScenarios({
        language: options.language,
        category: options.category,
        limit: 5, // Limit for demo
      });

      if (scenarios.length === 0) {
        throw new Error('No scenarios found matching the filters');
      }

      spinner.text = `Running ${scenarios.length} scenarios...`;

      // Run automation
      const automation = new DockerCopilotAutomation(config);
      const results = await automation.runSession(scenarios);

      spinner.succeed('Automation session completed');

      // Display results
      console.log(chalk.green('\n✅ Automation Results:'));
      console.log(chalk.blue(`Session ID: ${results.sessionId}`));
      console.log(
        chalk.blue(
          `Duration: ${Math.round((results.endTime.getTime() - results.startTime.getTime()) / 60000)} minutes`,
        ),
      );
      console.log(
        chalk.blue(`Success Rate: ${(results.summary.overallSuccessRate * 100).toFixed(1)}%`),
      );
      console.log(chalk.blue(`Total Interactions: ${results.summary.totalInteractions}`));

      // Export results
      if (options.output) {
        const exporter = new AutomationResultExporter();
        await exporter.exportDetailedReport(results, options.output);
        console.log(chalk.green(`\n📊 Results exported to: ${options.output}`));
      }
    } catch (error) {
      spinner.fail('Automation failed');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// List scenarios command
program
  .command('scenarios')
  .description('List available test scenarios')
  .option('-l, --language <language>', 'Filter by programming language')
  .option('-c, --category <category>', 'Filter by scenario category')
  .action((options) => {
    const scenarios = ScenarioFactory.getFilteredScenarios({
      language: options.language,
      category: options.category,
    });

    console.log(chalk.blue(`\n📋 Available Scenarios (${scenarios.length} total):\n`));

    scenarios.forEach((scenario, index: number) => {
      console.log(chalk.green(`${index + 1}. ${scenario.name}`));
      console.log(chalk.gray(`   Language: ${scenario.language}`));
      console.log(chalk.gray(`   Category: ${scenario.metadata?.category || 'uncategorized'}`));
      console.log(chalk.gray(`   Description: ${scenario.description}`));
      console.log('');
    });
  });

// Test Docker setup command
program
  .command('test-setup')
  .description('Test Docker environment setup')
  .option('-t, --token <token>', 'GitHub token for Copilot authentication')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    const spinner = ora('Testing Docker setup...').start();

    try {
      if (!options.token) {
        throw new Error('GitHub token is required. Use --token option.');
      }

      const config = {
        githubToken: options.token,
        debug: options.debug || false,
      };

      const automation = new DockerCopilotAutomation(config);

      // Just test container startup and shutdown
      spinner.text = 'Starting test container...';
      const testResults = await automation.runSession([]);

      await automation.cleanup();

      spinner.succeed('Docker setup test completed');

      console.log(chalk.green('\n✅ Docker Environment Test Results:'));
      console.log(chalk.blue(`Container Status: ${testResults.containerInfo.status}`));
      console.log(
        chalk.blue(
          `Setup Time: ${Math.round((testResults.endTime.getTime() - testResults.startTime.getTime()) / 1000)}s`,
        ),
      );
    } catch (error) {
      spinner.fail('Docker setup test failed');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Categories command
program
  .command('categories')
  .description('List available scenario categories')
  .action(() => {
    const categories = ScenarioFactory.getAvailableCategories();

    console.log(chalk.blue('\n📂 Available Categories:\n'));
    categories.forEach((category: string, index: number) => {
      const count = ScenarioFactory.getFilteredScenarios({ category }).length;
      console.log(chalk.green(`${index + 1}. ${category} (${count} scenarios)`));
    });
    console.log('');
  });

program.parse();

/**
 * Export function for integration with main CLI
 */
export async function runAutomationCLI(): Promise<void> {
  await program.parseAsync(process.argv);
}
