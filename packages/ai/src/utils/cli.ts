/**
 * CLI utility functions for consistent command-line interface patterns
 */

import chalk from 'chalk';

/**
 * Extract error message with consistent fallback pattern
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Display error message with consistent formatting
 */
export function displayError(operation: string, error: unknown): void {
  const message = extractErrorMessage(error);
  console.log(chalk.red(`Error ${operation}: ${message}`));
}

/**
 * Display success message with consistent formatting
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green(message));
}

/**
 * Display warning message with consistent formatting
 */
export function displayWarning(message: string): void {
  console.log(chalk.yellow(message));
}

/**
 * Display info message with consistent formatting
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue(message));
}

/**
 * Display section header with consistent formatting
 */
export function displayHeader(title: string): void {
  console.log(chalk.bold(title));
}

/**
 * Display numbered list item with consistent formatting
 */
export function displayListItem(index: number, content: string): void {
  console.log(`${chalk.cyan(`${index}.`)} ${content}`);
}

/**
 * Display key-value pair with consistent formatting
 */
export function displayKeyValue(key: string, value: string | number): void {
  console.log(`${chalk.gray(key + ':')} ${value}`);
}

/**
 * Format file path for display
 */
export function formatPath(path: string): string {
  return chalk.dim(path);
}

/**
 * Format count/number for display
 */
export function formatCount(count: number): string {
  return chalk.cyan(count.toString());
}

/**
 * Display a separator line
 */
export function displaySeparator(): void {
  console.log(chalk.gray('─'.repeat(50)));
}

/**
 * Display progress indicator
 */
export function displayProgress(current: number, total: number, operation: string): void {
  const percentage = Math.round((current / total) * 100);
  console.log(chalk.blue(`[${percentage}%] ${operation} (${current}/${total})`));
}
