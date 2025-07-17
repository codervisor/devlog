/**
 * Simple JSON exporter for CodeHist chat data
 * 
 * TypeScript implementation without complex configuration.
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export interface JSONExportOptions {
  indent?: number;
  ensureAscii?: boolean;
}

export class JSONExporter {
  private defaultOptions: JSONExportOptions = {
    indent: 2,
    ensureAscii: false
  };

  /**
   * Export arbitrary data to JSON file
   */
  async exportData(data: Record<string, any>, outputPath: string, options?: JSONExportOptions): Promise<void> {
    const exportOptions = { ...this.defaultOptions, ...options };

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Convert data to JSON string
    const jsonString = JSON.stringify(data, this.jsonReplacer, exportOptions.indent);

    // Write JSON file
    await writeFile(outputPath, jsonString, 'utf-8');
  }

  /**
   * Export chat data specifically
   */
  async exportChatData(data: Record<string, any>, outputPath: string, options?: JSONExportOptions): Promise<void> {
    return this.exportData(data, outputPath, options);
  }

  /**
   * Custom JSON replacer function for objects that aren't JSON serializable by default
   */
  private jsonReplacer(key: string, value: any): any {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle objects with toDict method
    if (value && typeof value === 'object' && typeof value.toDict === 'function') {
      return value.toDict();
    }

    // Handle objects with toJSON method
    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
      return value.toJSON();
    }

    return value;
  }
}
