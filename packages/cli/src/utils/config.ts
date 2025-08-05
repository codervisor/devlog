/**
 * Configuration management for DevLog CLI
 *
 * Handles loading and merging configuration from files, environment variables,
 * and command line options.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

export interface ConfigOptions {
  server?: string;
  workspace?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  defaultSource?: string;
  autoLink?: boolean;
  linkingThreshold?: number;
}

const DEFAULT_CONFIG: ConfigOptions = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  defaultSource: 'github-copilot',
  autoLink: true,
  linkingThreshold: 0.8,
};

export async function loadConfig(configPath?: string): Promise<ConfigOptions> {
  let config = { ...DEFAULT_CONFIG };

  // Try to load from default locations
  const defaultPaths = [
    configPath,
    resolve(homedir(), '.devlog', 'config.json'),
    resolve(homedir(), '.config', 'devlog', 'config.json'),
  ].filter(Boolean) as string[];

  for (const path of defaultPaths) {
    if (existsSync(path)) {
      try {
        const fileContent = await readFile(path, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        config = { ...config, ...fileConfig };
        console.log(`📋 Using config from: ${path}`);
        break;
      } catch (error) {
        console.warn(`⚠️  Could not parse config file ${path}:`, error);
      }
    }
  }

  // Override with environment variables
  if (process.env.DEVLOG_SERVER) {
    config.server = process.env.DEVLOG_SERVER;
  }
  if (process.env.DEVLOG_WORKSPACE) {
    config.workspace = process.env.DEVLOG_WORKSPACE;
  }
  if (process.env.DEVLOG_TIMEOUT) {
    config.timeout = parseInt(process.env.DEVLOG_TIMEOUT, 10);
  }

  return config;
}

export function getDefaultConfigPath(): string {
  return resolve(homedir(), '.devlog', 'config.json');
}

export function getConfigSchema(): object {
  return {
    type: 'object',
    properties: {
      server: {
        type: 'string',
        description: 'DevLog server URL (e.g., http://localhost:3200)',
      },
      workspace: {
        type: 'string',
        description: 'Default workspace ID',
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        minimum: 1000,
        maximum: 300000,
      },
      retries: {
        type: 'number',
        description: 'Number of retry attempts for failed requests',
        minimum: 0,
        maximum: 10,
      },
      retryDelay: {
        type: 'number',
        description: 'Delay between retry attempts in milliseconds',
        minimum: 100,
        maximum: 10000,
      },
      defaultSource: {
        type: 'string',
        enum: ['github-copilot', 'cursor', 'claude'],
        description: 'Default chat source to import from',
      },
      autoLink: {
        type: 'boolean',
        description: 'Automatically link chat sessions to devlog entries',
      },
      linkingThreshold: {
        type: 'number',
        description: 'Confidence threshold for automatic linking (0-1)',
        minimum: 0,
        maximum: 1,
      },
    },
  };
}
