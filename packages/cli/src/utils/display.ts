/**
 * Display utilities for CLI output
 *
 * Provides consistent formatting and styling for CLI messages
 */

import chalk from 'chalk';

export function displayError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`❌ Error ${context}: ${message}`));
}

export function displaySuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

export function displayWarning(message: string): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
}

export function displayInfo(message: string): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
}

export function displayHeader(title: string): void {
  console.log(chalk.bold.blue(`\n${title}`));
  console.log(chalk.blue('='.repeat(title.length)));
}

export function formatCount(count: number): string {
  return count.toLocaleString();
}

export function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
