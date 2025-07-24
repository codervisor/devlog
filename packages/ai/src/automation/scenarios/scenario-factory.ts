/**
 * Scenario Factory
 *
 * Factory for creating test scenarios dynamically
 */

import { CodeGenerationScenario } from './code-generation-scenario.js';
import type { TestScenario } from '../types/index.js';

export class ScenarioFactory {
  /**
   * Create a custom scenario
   */
  static createCustomScenario(config: TestScenario): CodeGenerationScenario {
    return new CodeGenerationScenario(config);
  }

  /**
   * Create scenarios from template
   */
  static createFromTemplate(
    template: Partial<TestScenario>,
    variations: Array<Partial<TestScenario>>,
  ): CodeGenerationScenario[] {
    return variations.map((variation, index) => {
      const config: TestScenario = {
        id: `custom-${Date.now()}-${index}`,
        name: 'Custom Scenario',
        description: 'Custom test scenario',
        language: 'javascript',
        initialCode: '',
        expectedPrompts: [],
        ...template,
        ...variation,
      };
      return new CodeGenerationScenario(config);
    });
  }

  /**
   * Create scenarios for specific language patterns
   */
  static createLanguagePatternScenarios(language: string): CodeGenerationScenario[] {
    const patterns = this.getLanguagePatterns(language);

    return patterns.map((pattern, index) => {
      return new CodeGenerationScenario({
        id: `${language}-pattern-${index}`,
        name: `${pattern.name} Pattern`,
        description: `Test ${pattern.name} pattern in ${language}`,
        language,
        initialCode: pattern.initialCode,
        expectedPrompts: pattern.expectedPrompts,
        timeout: 30000,
        metadata: {
          category: 'patterns',
          language,
          pattern: pattern.name,
        },
      });
    });
  }

  /**
   * Get common patterns for different languages
   */
  private static getLanguagePatterns(language: string) {
    const patterns: Record<string, any[]> = {
      python: [
        {
          name: 'Class Definition',
          initialCode: '# TODO: Create a User class with constructor and methods',
          expectedPrompts: [
            'class User:',
            '    def __init__(self, name, email):',
            '    def get_info(self):',
          ],
        },
        {
          name: 'Exception Handling',
          initialCode: '# TODO: Add try-catch for file operations',
          expectedPrompts: [
            'try:',
            "    with open(filename, 'r') as f:",
            'except FileNotFoundError:',
          ],
        },
      ],
      javascript: [
        {
          name: 'Async Function',
          initialCode: '// TODO: Create async function to fetch user data',
          expectedPrompts: [
            'async function fetchUserData(userId) {',
            '    try {',
            '        const response = await fetch(',
          ],
        },
        {
          name: 'Promise Chain',
          initialCode: '// TODO: Chain promises for data processing',
          expectedPrompts: [
            'fetch(url)',
            '    .then(response => response.json())',
            '    .then(data =>',
          ],
        },
      ],
      typescript: [
        {
          name: 'Interface Definition',
          initialCode: '// TODO: Define interfaces for API response',
          expectedPrompts: ['interface ApiResponse<T> {', '    data: T;', '    status: number;'],
        },
        {
          name: 'Generic Function',
          initialCode: '// TODO: Create generic utility function',
          expectedPrompts: ['function identity<T>(arg: T): T {', '    return arg;'],
        },
      ],
    };

    return patterns[language] || [];
  }

  /**
   * Create performance testing scenarios
   */
  static createPerformanceScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'performance-optimization',
        name: 'Performance Optimization',
        description: "Test Copilot's performance optimization suggestions",
        language: 'javascript',
        initialCode: `// TODO: Optimize this slow function
function processLargeArray(arr) {
    // This function is slow, need to optimize`,
        expectedPrompts: [
          'const result = [];',
          'const batchSize = 1000;',
          'for (let i = 0; i < arr.length; i += batchSize) {',
        ],
        timeout: 30000,
        metadata: { category: 'performance', difficulty: 'hard' },
      }),
    ];
  }

  /**
   * Create security-focused scenarios
   */
  static createSecurityScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'security-validation',
        name: 'Input Security Validation',
        description: "Test Copilot's security validation patterns",
        language: 'javascript',
        initialCode: `// TODO: Add security validation for user input
function sanitizeUserInput(input) {`,
        expectedPrompts: [
          "if (!input || typeof input !== 'string') {",
          'input = input.trim();',
          "input = input.replace(/[<>]/g, '');",
        ],
        timeout: 30000,
        metadata: { category: 'security', difficulty: 'medium' },
      }),
    ];
  }

  /**
   * Get all available scenario categories
   */
  static getAvailableCategories(): string[] {
    return ['algorithms', 'api', 'data', 'testing', 'patterns', 'performance', 'security'];
  }

  /**
   * Get scenarios by multiple filters
   */
  static getFilteredScenarios(filters: {
    language?: string;
    category?: string;
    difficulty?: string;
    limit?: number;
  }): CodeGenerationScenario[] {
    let scenarios = CodeGenerationScenario.getAllScenarios();

    if (filters.language) {
      scenarios = scenarios.filter((s) => s.language === filters.language);
    }

    if (filters.category) {
      scenarios = scenarios.filter((s) => s.metadata?.category === filters.category);
    }

    if (filters.difficulty) {
      scenarios = scenarios.filter((s) => s.metadata?.difficulty === filters.difficulty);
    }

    if (filters.limit) {
      scenarios = scenarios.slice(0, filters.limit);
    }

    return scenarios;
  }
}
