/**
 * Tests for Exporters
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, rm, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { JSONExporter } from '../exporters/json.js';
import { MarkdownExporter } from '../exporters/markdown.js';
import type { ChatStatistics } from '../parsers/index.js';

const TEST_OUTPUT_DIR = resolve(process.cwd(), 'test-output');

describe('JSONExporter', () => {
  let exporter: JSONExporter;

  beforeEach(async () => {
    exporter = new JSONExporter();
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should export data to JSON file', async () => {
    const testData = {
      test: 'data',
      number: 42,
      array: [1, 2, 3],
    };

    const outputPath = resolve(TEST_OUTPUT_DIR, 'test.json');
    await exporter.exportData(testData, outputPath);

    const fileContent = await readFile(outputPath, 'utf-8');
    const parsedData = JSON.parse(fileContent);

    expect(parsedData).toEqual(testData);
  });

  it('should handle Date objects in JSON export', async () => {
    const testDate = new Date('2023-01-01T00:00:00.000Z');
    const testData = {
      timestamp: testDate,
    };

    const outputPath = resolve(TEST_OUTPUT_DIR, 'test-date.json');
    await exporter.exportData(testData, outputPath);

    const fileContent = await readFile(outputPath, 'utf-8');
    const parsedData = JSON.parse(fileContent);

    expect(parsedData.timestamp).toBe('2023-01-01T00:00:00.000Z');
  });
});

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;

  beforeEach(async () => {
    exporter = new MarkdownExporter();
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should export statistics to Markdown', async () => {
    const stats: ChatStatistics = {
      total_sessions: 2,
      total_messages: 5,
      message_types: { user: 2, assistant: 3 },
      session_types: { chat_session: 2 },
      workspace_activity: {},
      date_range: {
        earliest: '2023-01-01T00:00:00.000Z',
        latest: '2023-01-02T00:00:00.000Z',
      },
      agent_activity: { 'GitHub Copilot': 2 },
    };

    const exportData = { statistics: stats };
    const outputPath = resolve(TEST_OUTPUT_DIR, 'stats.md');

    await exporter.exportChatData(exportData, outputPath);

    const fileContent = await readFile(outputPath, 'utf-8');

    expect(fileContent).toContain('# GitHub Copilot Chat History');
    expect(fileContent).toContain('**Total Sessions:** 2');
    expect(fileContent).toContain('**Total Messages:** 5');
    expect(fileContent).toContain('user: 2');
    expect(fileContent).toContain('assistant: 3');
  });
});
