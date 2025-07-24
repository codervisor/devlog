/**
 * Real-time Copilot Interaction Capture Parser
 *
 * Captures and parses Copilot interactions in real-time during automation
 */

import { EventEmitter } from 'events';
import type { CopilotInteraction } from '../types/index.js';

export class RealTimeCaptureParser extends EventEmitter {
  private isCapturing = false;
  private interactions: CopilotInteraction[] = [];
  private startTime?: Date;

  /**
   * Start capturing Copilot interactions
   */
  startCapture(): void {
    if (this.isCapturing) {
      throw new Error('Capture is already in progress');
    }

    this.isCapturing = true;
    this.startTime = new Date();
    this.interactions = [];

    this.emit('captureStarted');
  }

  /**
   * Stop capturing and return collected interactions
   */
  async stopCapture(): Promise<CopilotInteraction[]> {
    if (!this.isCapturing) {
      throw new Error('No capture in progress');
    }

    this.isCapturing = false;
    const capturedInteractions = [...this.interactions];

    this.emit('captureStopped', capturedInteractions);

    return capturedInteractions;
  }

  /**
   * Record a Copilot interaction
   */
  recordInteraction(interaction: CopilotInteraction): void {
    if (!this.isCapturing) {
      return;
    }

    this.interactions.push(interaction);
    this.emit('interactionRecorded', interaction);
  }

  /**
   * Create interaction from VS Code telemetry data
   */
  createInteractionFromTelemetry(telemetryData: any): CopilotInteraction {
    return {
      timestamp: new Date(telemetryData.timestamp || Date.now()),
      trigger: this.mapTriggerType(telemetryData.trigger),
      context: {
        fileName: telemetryData.fileName || 'unknown',
        fileContent: telemetryData.fileContent || '',
        cursorPosition: {
          line: telemetryData.line || 0,
          character: telemetryData.character || 0,
        },
        precedingText: telemetryData.precedingText || '',
        followingText: telemetryData.followingText || '',
      },
      suggestion: telemetryData.suggestion
        ? {
            text: telemetryData.suggestion.text,
            confidence: telemetryData.suggestion.confidence,
            accepted: telemetryData.suggestion.accepted || false,
            alternativeCount: telemetryData.suggestion.alternatives?.length || 0,
          }
        : undefined,
      metadata: {
        responseTime: telemetryData.responseTime,
        completionType: telemetryData.completionType,
        ...telemetryData.metadata,
      },
    };
  }

  /**
   * Parse VS Code logs for Copilot interactions
   */
  async parseVSCodeLogs(logContent: string): Promise<CopilotInteraction[]> {
    const interactions: CopilotInteraction[] = [];
    const logLines = logContent.split('\n');

    for (const line of logLines) {
      const interaction = this.parseLogLine(line);
      if (interaction) {
        interactions.push(interaction);
      }
    }

    return interactions;
  }

  /**
   * Parse a single log line for Copilot data
   */
  private parseLogLine(line: string): CopilotInteraction | null {
    // Look for Copilot-related log entries
    const copilotPatterns = [
      /\[copilot\].*completion.*requested/i,
      /\[copilot\].*suggestion.*shown/i,
      /\[copilot\].*suggestion.*accepted/i,
      /\[copilot\].*suggestion.*dismissed/i,
    ];

    for (const pattern of copilotPatterns) {
      if (pattern.test(line)) {
        return this.extractInteractionFromLogLine(line);
      }
    }

    return null;
  }

  /**
   * Extract interaction data from log line
   */
  private extractInteractionFromLogLine(line: string): CopilotInteraction {
    // Basic parsing - would need enhancement for real VS Code logs
    const timestamp = this.extractTimestamp(line) || new Date();
    const trigger = this.extractTrigger(line);

    return {
      timestamp,
      trigger,
      context: {
        fileName: this.extractFileName(line) || 'unknown',
        fileContent: '',
        cursorPosition: { line: 0, character: 0 },
        precedingText: '',
        followingText: '',
      },
      suggestion: {
        text: this.extractSuggestionText(line) || '',
        accepted: line.includes('accepted'),
      },
      metadata: {
        logLine: line,
      },
    };
  }

  /**
   * Extract timestamp from log line
   */
  private extractTimestamp(line: string): Date | null {
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    return timestampMatch ? new Date(timestampMatch[1]) : null;
  }

  /**
   * Extract trigger type from log line
   */
  private extractTrigger(line: string): CopilotInteraction['trigger'] {
    if (line.includes('keystroke') || line.includes('typing')) {
      return 'keystroke';
    }
    if (line.includes('tab') || line.includes('accept')) {
      return 'tab';
    }
    return 'manual';
  }

  /**
   * Extract filename from log line
   */
  private extractFileName(line: string): string | null {
    const fileMatch = line.match(/file[:\s]+([^,\s]+)/i);
    return fileMatch ? fileMatch[1] : null;
  }

  /**
   * Extract suggestion text from log line
   */
  private extractSuggestionText(line: string): string | null {
    const suggestionMatch = line.match(/suggestion[:\s]+"([^"]+)"/i);
    return suggestionMatch ? suggestionMatch[1] : null;
  }

  /**
   * Map telemetry trigger to interaction trigger
   */
  private mapTriggerType(trigger: string): CopilotInteraction['trigger'] {
    switch (trigger?.toLowerCase()) {
      case 'keystroke':
      case 'typing':
        return 'keystroke';
      case 'tab':
      case 'accept':
        return 'tab';
      default:
        return 'manual';
    }
  }

  /**
   * Get capture statistics
   */
  getCaptureStats(): {
    isCapturing: boolean;
    duration: number;
    interactionCount: number;
    startTime?: Date;
  } {
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      isCapturing: this.isCapturing,
      duration,
      interactionCount: this.interactions.length,
      startTime: this.startTime,
    };
  }

  /**
   * Clear captured interactions
   */
  clearCapture(): void {
    this.interactions = [];
    this.startTime = undefined;
  }
}
