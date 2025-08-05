/**
 * Docker-based GitHub Copilot Automation
 *
 * Main orchestrator for automated Copilot testing using containerized VS Code
 */

import { VSCodeContainer } from './vscode-container.js';
import { RealTimeCaptureParser } from '../capture/real-time-parser.js';
import type {
  AutomationConfig,
  TestScenario,
  TestScenarioResult,
  AutomationSessionResult,
  ContainerStatus,
} from '../types/index.js';

export class DockerCopilotAutomation {
  private container: VSCodeContainer;
  private captureParser: RealTimeCaptureParser;
  private config: AutomationConfig;
  private sessionId: string;

  constructor(config: AutomationConfig) {
    this.config = config;
    this.container = new VSCodeContainer(config);
    this.captureParser = new RealTimeCaptureParser();
    this.sessionId = `automation-${Date.now()}`;
  }

  /**
   * Run a complete automation session with multiple test scenarios
   */
  async runSession(scenarios: TestScenario[]): Promise<AutomationSessionResult> {
    const startTime = new Date();
    let containerInfo: ContainerStatus;
    const results: TestScenarioResult[] = [];

    try {
      // Start the container
      if (this.config.debug) {
        console.log('Starting automation session...');
      }

      containerInfo = await this.container.start();

      // Wait for container to be fully ready
      await this.waitForContainerReady();

      // Run each test scenario
      for (const scenario of scenarios) {
        if (this.config.debug) {
          console.log(`Running scenario: ${scenario.name}`);
        }

        try {
          const result = await this.runScenario(scenario);
          results.push(result);
        } catch (error) {
          // Create failed result
          results.push({
            scenarioId: scenario.id,
            startTime: new Date(),
            endTime: new Date(),
            success: false,
            interactions: [],
            generatedCode: '',
            metrics: {
              totalSuggestions: 0,
              acceptedSuggestions: 0,
              rejectedSuggestions: 0,
              averageResponseTime: 0,
            },
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      // Always clean up the container
      try {
        await this.container.stop();
        containerInfo = this.container.getStatus();
      } catch (error) {
        console.error('Error stopping container:', error);
        containerInfo = { id: '', status: 'error', error: String(error) };
      }
    }

    const endTime = new Date();
    const successful = results.filter((r) => r.success).length;
    const totalInteractions = results.reduce((sum, r) => sum + r.interactions.length, 0);

    return {
      sessionId: this.sessionId,
      startTime,
      endTime,
      scenarios: results,
      containerInfo,
      summary: {
        totalScenarios: scenarios.length,
        successfulScenarios: successful,
        failedScenarios: scenarios.length - successful,
        totalInteractions,
        overallSuccessRate: scenarios.length > 0 ? successful / scenarios.length : 0,
      },
    };
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestScenarioResult> {
    const startTime = new Date();
    const interactions: TestScenarioResult['interactions'] = [];

    try {
      // Create test file in container
      await this.createTestFile(scenario);

      // Start capture parser
      this.captureParser.startCapture();

      // Execute the test scenario
      await this.executeScenarioSteps(scenario, interactions);

      // Stop capture and get interactions
      const capturedInteractions = await this.captureParser.stopCapture();
      interactions.push(...capturedInteractions);

      // Get the generated code
      const generatedCode = await this.getGeneratedCode(scenario);

      // Calculate metrics
      const metrics = this.calculateMetrics(interactions);

      return {
        scenarioId: scenario.id,
        startTime,
        endTime: new Date(),
        success: true,
        interactions,
        generatedCode,
        metrics,
      };
    } catch (error) {
      return {
        scenarioId: scenario.id,
        startTime,
        endTime: new Date(),
        success: false,
        interactions,
        generatedCode: '',
        metrics: {
          totalSuggestions: 0,
          acceptedSuggestions: 0,
          rejectedSuggestions: 0,
          averageResponseTime: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Wait for the container to be fully ready for automation
   */
  private async waitForContainerReady(): Promise<void> {
    // Wait for VS Code extensions to be fully loaded
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify Copilot extension is active
    try {
      const checkCommand = ['code-insiders', '--list-extensions', '--show-versions'];

      const output = await this.container.executeInContainer(checkCommand);

      if (!output.includes('GitHub.copilot')) {
        throw new Error('GitHub Copilot extension not found');
      }

      if (this.config.debug) {
        console.log('Container is ready for automation');
      }
    } catch (error) {
      throw new Error(`Container readiness check failed: ${error}`);
    }
  }

  /**
   * Create test file for scenario in container
   */
  private async createTestFile(scenario: TestScenario): Promise<void> {
    const fileName = `test-${scenario.id}.${this.getFileExtension(scenario.language)}`;
    const filePath = `/workspace/automation-test/src/${fileName}`;

    // Create the file with initial code
    const createFileCommand = [
      'sh',
      '-c',
      `echo '${scenario.initialCode.replace(/'/g, "'\\''")}' > ${filePath}`,
    ];

    await this.container.executeInContainer(createFileCommand);

    if (this.config.debug) {
      console.log(`Created test file: ${filePath}`);
    }
  }

  /**
   * Execute the steps for a test scenario
   */
  private async executeScenarioSteps(
    scenario: TestScenario,
    interactions: TestScenarioResult['interactions'],
  ): Promise<void> {
    const fileName = `test-${scenario.id}.${this.getFileExtension(scenario.language)}`;
    const filePath = `/workspace/automation-test/src/${fileName}`;

    // Open file in VS Code
    const openCommand = ['code-insiders', filePath, '--wait', '--new-window'];

    // This would need to use VS Code API or automation tools
    // For now, we'll simulate the process
    for (const prompt of scenario.expectedPrompts) {
      // Simulate typing the prompt
      await this.simulateTyping(filePath, prompt);

      // Wait for Copilot suggestion
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Capture interaction (this would be done by real-time parser)
      interactions.push({
        timestamp: new Date(),
        trigger: 'keystroke',
        context: {
          fileName,
          fileContent: scenario.initialCode + prompt,
          cursorPosition: { line: 0, character: prompt.length },
          precedingText: scenario.initialCode,
          followingText: '',
        },
        suggestion: {
          text: `// Generated suggestion for: ${prompt}`,
          confidence: 0.8,
          accepted: true,
        },
      });
    }
  }

  /**
   * Simulate typing in VS Code (placeholder implementation)
   */
  private async simulateTyping(filePath: string, text: string): Promise<void> {
    // This would need actual VS Code automation
    // For now, append to file as simulation
    const appendCommand = ['sh', '-c', `echo '${text.replace(/'/g, "'\\''")}' >> ${filePath}`];

    await this.container.executeInContainer(appendCommand);
  }

  /**
   * Get the final generated code from the test file
   */
  private async getGeneratedCode(scenario: TestScenario): Promise<string> {
    const fileName = `test-${scenario.id}.${this.getFileExtension(scenario.language)}`;
    const filePath = `/workspace/automation-test/src/${fileName}`;

    const readCommand = ['cat', filePath];
    return await this.container.executeInContainer(readCommand);
  }

  /**
   * Calculate metrics from interactions
   */
  private calculateMetrics(
    interactions: TestScenarioResult['interactions'],
  ): TestScenarioResult['metrics'] {
    const suggestions = interactions.filter((i) => i.suggestion);
    const accepted = suggestions.filter((i) => i.suggestion?.accepted);

    const responseTimes = interactions
      .map((i) => i.metadata?.responseTime as number)
      .filter((t) => typeof t === 'number');

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      totalSuggestions: suggestions.length,
      acceptedSuggestions: accepted.length,
      rejectedSuggestions: suggestions.length - accepted.length,
      averageResponseTime,
    };
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
    };

    return extensions[language.toLowerCase()] || 'txt';
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.container.stop();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
