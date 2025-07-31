/**
 * Docker-based Copilot Automation Examples
 *
 * This file demonstrates how to use the automation features
 */

import {
  DockerCopilotAutomation,
  CodeGenerationScenario,
  ScenarioFactory,
  AutomationResultExporter,
  BaseScenario,
} from '../src/automation/index.js';
import type {
  AutomationConfig,
  TestScenario,
  AutomationSessionResult,
} from '../src/automation/types/index.js';

// Example 1: Basic automation session
export async function basicAutomationExample() {
  console.log('🤖 Running basic automation example...');

  const config: AutomationConfig = {
    githubToken: process.env.GITHUB_TOKEN!,
    timeout: 60000,
    debug: true,
  };

  // Get some algorithm scenarios
  const scenarios = CodeGenerationScenario.getScenariosByCategory('algorithms').slice(0, 2);

  const automation = new DockerCopilotAutomation(config);
  const sessionResult = await automation.runSession(scenarios);

  console.log(
    `✅ Session completed with ${sessionResult.summary.overallSuccessRate * 100}% success rate`,
  );

  // Export results
  const exporter = new AutomationResultExporter();
  await exporter.exportToJSON(sessionResult, './basic-automation-results.json');
}

// Example 2: Custom scenario creation
export async function customScenarioExample() {
  console.log('🧪 Creating custom test scenarios...');

  const customScenarios: TestScenario[] = [
    {
      id: 'custom-react-component',
      name: 'React Component Generation',
      description: "Test Copilot's React component creation abilities",
      language: 'typescript',
      initialCode: `// TODO: Create a reusable Button component with TypeScript
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({`,
      expectedPrompts: ['children,', 'onClick,', "variant = 'primary',", 'disabled = false'],
      timeout: 45000,
      metadata: {
        category: 'react',
        difficulty: 'medium',
        framework: 'react',
      },
    },
    {
      id: 'custom-api-middleware',
      name: 'Express Middleware Creation',
      description: 'Test API middleware pattern generation',
      language: 'javascript',
      initialCode: `// TODO: Create authentication middleware for Express
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Copilot should implement JWT verification`,
      expectedPrompts: [
        "const token = req.header('Authorization')",
        'if (!token) {',
        'jwt.verify(token',
        'req.user = decoded;',
      ],
      timeout: 30000,
      metadata: {
        category: 'api',
        difficulty: 'medium',
        framework: 'express',
      },
    },
  ];

  const config: AutomationConfig = {
    githubToken: process.env.GITHUB_TOKEN!,
    debug: true,
  };

  const automation = new DockerCopilotAutomation(config);
  const sessionResult = await automation.runSession(customScenarios);

  console.log(`✅ Custom scenarios completed: ${sessionResult.scenarios.length} total`);

  // Export detailed report
  const exporter = new AutomationResultExporter();
  await exporter.exportDetailedReport(sessionResult, './custom-scenario-results');
}

// Example 3: Language-specific testing
export async function languageSpecificExample() {
  console.log('🐍 Running Python-specific automation...');

  // Create Python-specific scenarios
  const pythonScenarios = ScenarioFactory.createLanguagePatternScenarios('python');

  // Add some data science scenarios
  const dataScienceScenarios = [
    new CodeGenerationScenario({
      id: 'pandas-analysis',
      name: 'Pandas Data Analysis',
      description: 'Test pandas data manipulation patterns',
      language: 'python',
      initialCode: `import pandas as pd
import numpy as np

# TODO: Create function to analyze sales data
def analyze_sales_data(df):
    """
    Analyze sales data and return key metrics
    Args:
        df: DataFrame with columns: date, product, quantity, price
    Returns:
        dict: Analysis results
    """`,
      expectedPrompts: [
        "df['total_sales'] = df['quantity'] * df['price']",
        'monthly_sales = df.groupby(',
        "top_products = df.groupby('product')",
        'return {',
      ],
      timeout: 45000,
      metadata: {
        category: 'data-science',
        difficulty: 'medium',
        libraries: ['pandas', 'numpy'],
      },
    }),
  ];

  const allScenarios = [...pythonScenarios, ...dataScienceScenarios];

  const config: AutomationConfig = {
    githubToken: process.env.GITHUB_TOKEN!,
    timeout: 90000, // Longer timeout for complex scenarios
    debug: true,
  };

  const automation = new DockerCopilotAutomation(config);
  const sessionResult = await automation.runSession(allScenarios);

  console.log(`🐍 Python automation completed!`);
  console.log(`   Scenarios: ${sessionResult.scenarios.length}`);
  console.log(`   Success rate: ${(sessionResult.summary.overallSuccessRate * 100).toFixed(1)}%`);
  console.log(`   Total interactions: ${sessionResult.summary.totalInteractions}`);

  // Export results
  const exporter = new AutomationResultExporter();
  await exporter.exportToMarkdown(sessionResult, './python-automation-report.md');
}

// Example 4: Performance testing
export async function performanceTestingExample() {
  console.log('⚡ Running performance-focused automation...');

  // Create scenarios that test Copilot's performance suggestions
  const performanceScenarios = [
    ...ScenarioFactory.createPerformanceScenarios(),
    new CodeGenerationScenario({
      id: 'optimization-challenge',
      name: 'Algorithm Optimization Challenge',
      description: 'Test optimization suggestions for slow algorithms',
      language: 'javascript',
      initialCode: `// TODO: Optimize this O(n²) algorithm to O(n log n) or better
function findDuplicates(arr) {
  const duplicates = [];
  // Current inefficient implementation
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// Optimized version:`,
      expectedPrompts: [
        'const seen = new Set();',
        'const duplicates = new Set();',
        'for (const item of arr) {',
        'if (seen.has(item)) {',
      ],
      timeout: 60000,
      metadata: {
        category: 'performance',
        difficulty: 'hard',
        focus: 'optimization',
      },
    }),
  ];

  const config: AutomationConfig = {
    githubToken: process.env.GITHUB_TOKEN!,
    timeout: 120000, // Extended timeout for complex optimizations
    debug: true,
  };

  const automation = new DockerCopilotAutomation(config);
  const sessionResult = await automation.runSession(performanceScenarios);

  // Analyze performance-related metrics
  const avgResponseTime =
    sessionResult.scenarios.reduce(
      (sum, scenario) => sum + scenario.metrics.averageResponseTime,
      0,
    ) / sessionResult.scenarios.length;

  console.log(`⚡ Performance testing completed!`);
  console.log(`   Average response time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`   Complex scenarios: ${performanceScenarios.length}`);

  // Export with CSV for detailed analysis
  const exporter = new AutomationResultExporter();
  await exporter.exportToCSV(sessionResult, './performance-test-data.csv');
}

// Example 5: Batch testing with filters
export async function batchTestingExample() {
  console.log('📊 Running comprehensive batch testing...');

  // Test multiple languages and categories
  const testMatrix = [
    { language: 'javascript', category: 'api', count: 3 },
    { language: 'typescript', category: 'testing', count: 2 },
    { language: 'python', category: 'algorithms', count: 3 },
    { language: 'javascript', category: 'performance', count: 2 },
  ];

  const allResults: Array<{
    language: string;
    category: string;
    count: number;
    result: AutomationSessionResult;
  }> = [];

  for (const testConfig of testMatrix) {
    console.log(`Testing ${testConfig.language} ${testConfig.category}...`);

    const scenarios = ScenarioFactory.getFilteredScenarios({
      language: testConfig.language,
      category: testConfig.category,
      limit: testConfig.count,
    });

    if (scenarios.length === 0) {
      console.log(`⚠️  No scenarios found for ${testConfig.language} ${testConfig.category}`);
      continue;
    }

    const config: AutomationConfig = {
      githubToken: process.env.GITHUB_TOKEN!,
      timeout: 45000,
      debug: false, // Reduce noise for batch testing
    };

    const automation = new DockerCopilotAutomation(config);
    const sessionResult = await automation.runSession(scenarios);

    allResults.push({
      ...testConfig,
      result: sessionResult,
    });

    console.log(
      `   ✅ ${testConfig.language}-${testConfig.category}: ${(sessionResult.summary.overallSuccessRate * 100).toFixed(1)}% success`,
    );
  }

  // Aggregate results
  const totalScenarios = allResults.reduce((sum, r) => sum + r.result.scenarios.length, 0);
  const totalSuccess = allResults.reduce((sum, r) => sum + r.result.summary.successfulScenarios, 0);
  const overallSuccessRate = totalSuccess / totalScenarios;

  console.log(`📊 Batch testing completed!`);
  console.log(`   Total scenarios: ${totalScenarios}`);
  console.log(`   Overall success rate: ${(overallSuccessRate * 100).toFixed(1)}%`);

  // Export summary report
  const summaryData = {
    sessionId: `batch-${Date.now()}`,
    startTime: new Date(),
    endTime: new Date(),
    scenarios: allResults.flatMap((r) => r.result.scenarios),
    containerInfo: { id: 'batch', status: 'stopped' as const },
    summary: {
      totalScenarios,
      successfulScenarios: totalSuccess,
      failedScenarios: totalScenarios - totalSuccess,
      totalInteractions: allResults.reduce((sum, r) => sum + r.result.summary.totalInteractions, 0),
      overallSuccessRate,
    },
  };

  const exporter = new AutomationResultExporter();
  await exporter.exportDetailedReport(summaryData, './batch-testing-results');
}

// Main example runner
export async function runAllExamples() {
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('Set your GitHub token: export GITHUB_TOKEN=your_token_here');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting Docker-based Copilot automation examples...\n');

    // Run examples in sequence
    await basicAutomationExample();
    console.log('');

    await customScenarioExample();
    console.log('');

    await languageSpecificExample();
    console.log('');

    await performanceTestingExample();
    console.log('');

    await batchTestingExample();

    console.log('\n🎉 All automation examples completed successfully!');
    console.log('Check the generated result files for detailed analysis.');
  } catch (error) {
    console.error('❌ Automation example failed:', error);
    process.exit(1);
  }
}

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
