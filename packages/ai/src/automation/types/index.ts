/**
 * Type definitions for automation layer
 */

// Docker container configuration
export interface AutomationConfig {
  /** GitHub token for Copilot authentication */
  githubToken: string;
  /** VS Code Insiders version to use */
  vscodeVersion?: string;
  /** Container port mapping */
  ports?: {
    codeServer: number;
    vscode: number;
  };
  /** Timeout for operations in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// Container status tracking
export interface ContainerStatus {
  id: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  ports?: {
    codeServer?: number;
    vscode?: number;
  };
  startTime?: Date;
  error?: string;
}

// Test scenario definition
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  language: string;
  initialCode: string;
  expectedPrompts: string[];
  timeout?: number;
  metadata?: Record<string, unknown>;
}

// Copilot interaction capture
export interface CopilotInteraction {
  timestamp: Date;
  trigger: 'keystroke' | 'tab' | 'manual';
  context: {
    fileName: string;
    fileContent: string;
    cursorPosition: {
      line: number;
      character: number;
    };
    precedingText: string;
    followingText: string;
  };
  suggestion?: {
    text: string;
    confidence?: number;
    accepted: boolean;
    alternativeCount?: number;
  };
  metadata?: Record<string, unknown>;
}

// Test scenario execution result
export interface TestScenarioResult {
  scenarioId: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  interactions: CopilotInteraction[];
  generatedCode: string;
  metrics: {
    totalSuggestions: number;
    acceptedSuggestions: number;
    rejectedSuggestions: number;
    averageResponseTime: number;
  };
  error?: string;
  metadata?: Record<string, unknown>;
}

// Automation session result
export interface AutomationSessionResult {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  scenarios: TestScenarioResult[];
  containerInfo: ContainerStatus;
  summary: {
    totalScenarios: number;
    successfulScenarios: number;
    failedScenarios: number;
    totalInteractions: number;
    overallSuccessRate: number;
  };
}
