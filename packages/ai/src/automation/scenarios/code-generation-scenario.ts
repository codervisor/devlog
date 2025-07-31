/**
 * Code Generation Test Scenarios
 *
 * Specific scenarios for testing code generation capabilities
 */

import { BaseScenario } from './base-scenario.js';
import type { TestScenario } from '../types/index.js';

export class CodeGenerationScenario extends BaseScenario {
  /**
   * Create common algorithm implementation scenarios
   */
  static createAlgorithmScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'algorithm-binary-search',
        name: 'Binary Search Implementation',
        description: "Test Copilot's ability to implement binary search algorithm",
        language: 'python',
        initialCode: `def binary_search(arr, target):
    """
    Implement binary search algorithm
    Args:
        arr: Sorted array to search in
        target: Value to find
    Returns:
        Index of target or -1 if not found
    """
    # TODO: Implement binary search`,
        expectedPrompts: [
          'left = 0',
          'right = len(arr) - 1',
          'while left <= right:',
          '    mid = (left + right) // 2',
        ],
        timeout: 30000,
        metadata: { category: 'algorithms', difficulty: 'medium' },
      }),

      new CodeGenerationScenario({
        id: 'algorithm-quicksort',
        name: 'Quicksort Implementation',
        description: "Test Copilot's ability to implement quicksort algorithm",
        language: 'javascript',
        initialCode: `/**
 * Implement quicksort algorithm
 * @param {number[]} arr - Array to sort
 * @returns {number[]} Sorted array
 */
function quicksort(arr) {
    // TODO: Implement quicksort`,
        expectedPrompts: [
          'if (arr.length <= 1) return arr;',
          'const pivot = arr[Math.floor(arr.length / 2)];',
          'const left = [];',
          'const right = [];',
        ],
        timeout: 30000,
        metadata: { category: 'algorithms', difficulty: 'hard' },
      }),
    ];
  }

  /**
   * Create API endpoint scenarios
   */
  static createAPIScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'api-rest-endpoints',
        name: 'REST API Endpoints',
        description: "Test Copilot's ability to create REST API endpoints",
        language: 'javascript',
        initialCode: `const express = require('express');
const app = express();

app.use(express.json());

// TODO: Create CRUD endpoints for users`,
        expectedPrompts: [
          '// GET /users - get all users',
          "app.get('/users', (req, res) => {",
          '// POST /users - create user',
          "app.post('/users', (req, res) => {",
        ],
        timeout: 45000,
        metadata: { category: 'api', difficulty: 'medium' },
      }),

      new CodeGenerationScenario({
        id: 'api-error-handling',
        name: 'API Error Handling',
        description: "Test Copilot's error handling patterns",
        language: 'typescript',
        initialCode: `interface User {
    id: number;
    name: string;
    email: string;
}

class UserService {
    // TODO: Add error handling for user operations`,
        expectedPrompts: [
          'async findUser(id: number): Promise<User | null> {',
          'try {',
          '} catch (error) {',
          'throw new Error(',
        ],
        timeout: 30000,
        metadata: { category: 'api', difficulty: 'medium' },
      }),
    ];
  }

  /**
   * Create data processing scenarios
   */
  static createDataProcessingScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'data-validation',
        name: 'Data Validation Functions',
        description: "Test Copilot's data validation patterns",
        language: 'typescript',
        initialCode: `// TODO: Create validation functions for user data
interface UserData {
    email: string;
    phone: string;
    age: number;
}`,
        expectedPrompts: [
          'function validateEmail(email: string): boolean {',
          'const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;',
          'function validatePhone(phone: string): boolean {',
          'function validateAge(age: number): boolean {',
        ],
        timeout: 30000,
        metadata: { category: 'validation', difficulty: 'easy' },
      }),

      new CodeGenerationScenario({
        id: 'data-transformation',
        name: 'Data Transformation',
        description: "Test Copilot's data transformation capabilities",
        language: 'python',
        initialCode: `import pandas as pd
import numpy as np

# TODO: Create data transformation functions
def transform_user_data(df):
    """Transform raw user data for analysis"""`,
        expectedPrompts: [
          '# Clean email addresses',
          "df['email'] = df['email'].str.lower().str.strip()",
          '# Parse dates',
          "df['created_at'] = pd.to_datetime(df['created_at'])",
        ],
        timeout: 30000,
        metadata: { category: 'data', difficulty: 'medium' },
      }),
    ];
  }

  /**
   * Create testing scenarios
   */
  static createTestingScenarios(): CodeGenerationScenario[] {
    return [
      new CodeGenerationScenario({
        id: 'unit-tests',
        name: 'Unit Test Generation',
        description: "Test Copilot's ability to generate unit tests",
        language: 'javascript',
        initialCode: `function calculateArea(radius) {
    if (radius < 0) throw new Error('Radius cannot be negative');
    return Math.PI * radius * radius;
}

// TODO: Write unit tests for calculateArea function`,
        expectedPrompts: [
          "describe('calculateArea', () => {",
          "it('should calculate area correctly', () => {",
          "it('should throw error for negative radius', () => {",
          'expect(() => calculateArea(-1)).toThrow(',
        ],
        timeout: 30000,
        metadata: { category: 'testing', difficulty: 'easy' },
      }),
    ];
  }

  /**
   * Get all predefined scenarios
   */
  static getAllScenarios(): CodeGenerationScenario[] {
    return [
      ...this.createAlgorithmScenarios(),
      ...this.createAPIScenarios(),
      ...this.createDataProcessingScenarios(),
      ...this.createTestingScenarios(),
    ];
  }

  /**
   * Filter scenarios by category
   */
  static getScenariosByCategory(category: string): CodeGenerationScenario[] {
    return this.getAllScenarios().filter((scenario) => scenario.metadata?.category === category);
  }

  /**
   * Filter scenarios by language
   */
  static getScenariosByLanguage(language: string): CodeGenerationScenario[] {
    return this.getAllScenarios().filter((scenario) => scenario.language === language);
  }

  /**
   * Filter scenarios by difficulty
   */
  static getScenariosByDifficulty(difficulty: string): CodeGenerationScenario[] {
    return this.getAllScenarios().filter(
      (scenario) => scenario.metadata?.difficulty === difficulty,
    );
  }
}
