/**
 * Base Test Scenario Implementation
 *
 * Provides base functionality for test scenarios
 */

import type { TestScenario } from '../types/index.js';

export abstract class BaseScenario implements TestScenario {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly language: string;
  public readonly initialCode: string;
  public readonly expectedPrompts: string[];
  public readonly timeout?: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(config: TestScenario) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.language = config.language;
    this.initialCode = config.initialCode;
    this.expectedPrompts = config.expectedPrompts;
    this.timeout = config.timeout;
    this.metadata = config.metadata;
  }

  /**
   * Validate scenario configuration
   */
  validate(): boolean {
    return !!(
      this.id &&
      this.name &&
      this.language &&
      this.initialCode &&
      this.expectedPrompts.length > 0
    );
  }

  /**
   * Get scenario summary
   */
  getSummary(): string {
    return `${this.name} (${this.language}): ${this.expectedPrompts.length} prompts`;
  }

  /**
   * Create a copy of the scenario with modifications
   */
  withModifications(modifications: Partial<TestScenario>): TestScenario {
    return {
      ...this,
      ...modifications,
    };
  }
}
