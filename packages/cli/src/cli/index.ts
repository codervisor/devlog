#!/usr/bin/env node

/**
 * DevLog CLI - Main Entry Point
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('devlog')
  .description('DevLog CLI - Stream chat history and manage devlog projects')
  .version('0.1.0')
  .option('-s, --server <url>', 'DevLog server URL')
  .option('-w, --project <id>', 'Project ID')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Show detailed progress', false);

// Parse and execute
program.parse();
