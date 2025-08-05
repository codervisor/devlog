/**
 * DevLog Development Environment CLI
 *
 * Command-line interface for managing the local development environment
 * using Docker Compose.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import ora from 'ora';

const DEV_COMPOSE_FILE = 'docker-compose.dev.yml';

// Helper function to run shell commands
const runCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(chalk.red(stderr || error.message)));
        return;
      }
      resolve(stdout.trim());
    });
  });
};

const program = new Command();

program
  .name('devlog-dev')
  .description('Manage local development environment for DevLog')
  .version('0.1.0');

program
  .command('up')
  .description('Start the development environment in detached mode')
  .action(async () => {
    const spinner = ora('Starting development environment...').start();
    try {
      const command = `docker compose -f ${DEV_COMPOSE_FILE} up -d --wait`;
      await runCommand(command);
      spinner.succeed(chalk.green('Development environment is up and running.'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to start environment.'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('down')
  .description('Stop the development environment')
  .action(async () => {
    const spinner = ora('Stopping development environment...').start();
    try {
      const command = `docker compose -f ${DEV_COMPOSE_FILE} down`;
      await runCommand(command);
      spinner.succeed(chalk.green('Development environment stopped.'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop environment.'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show the status of the development environment containers')
  .action(async () => {
    try {
      const command = `docker compose -f ${DEV_COMPOSE_FILE} ps`;
      const output = await runCommand(command);
      console.log(chalk.blue('Development Environment Status:'));
      console.log(output);
    } catch (error) {
      console.error(chalk.red('Failed to get environment status.'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('View logs from the development environment containers')
  .argument('[service]', 'Optional service name to view logs for')
  .option('-f, --follow', 'Follow log output', false)
  .action(async (service, options) => {
    try {
      let command = `docker compose -f ${DEV_COMPOSE_FILE} logs`;
      if (options.follow) {
        command += ' -f';
      }
      if (service) {
        command += ` ${service}`;
      }
      await runCommand(command);
    } catch (error) {
      console.error(chalk.red('Failed to retrieve logs.'));
      console.error(error);
      process.exit(1);
    }
  });

export async function runDevCLI(): Promise<void> {
  await program.parseAsync(process.argv);
}
