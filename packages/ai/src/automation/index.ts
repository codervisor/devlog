/**
 * AI Automation Layer
 *
 * Provides Docker-based automated testing capabilities for GitHub Copilot
 * and other AI coding assistants.
 */

// Export Docker orchestration
export { DockerCopilotAutomation } from './docker/copilot-automation.js';
export { VSCodeContainer } from './docker/vscode-container.js';

// Export test scenarios
export { BaseScenario, CodeGenerationScenario, ScenarioFactory } from './scenarios/index.js';

// Export real-time capture
export { RealTimeCaptureParser } from './capture/real-time-parser.js';
export { AutomationResultExporter } from './exporters/automation-exporter.js';

// Export types
export type {
  AutomationConfig,
  TestScenarioResult,
  CopilotInteraction,
  ContainerStatus,
} from './types/index.js';
