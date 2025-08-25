#!/usr/bin/env -S pnpm exec tsx

/**
 * Validation Runner - Runs all validation scripts
 * Orchestrates multiple validation checks across the codebase
 */

import { spawn } from 'child_process';
import path from 'path';

interface ValidationResult {
  name: string;
  script: string;
  passed: boolean;
  output: string;
  error?: string;
}

const VALIDATION_SCRIPTS = [
  {
    name: 'Import Patterns',
    script: 'validate-imports.ts',
    description: 'Validates ESM import patterns and cross-package imports',
  },
  {
    name: 'File Naming Conventions',
    script: 'validate-file-naming.ts',
    description: 'Validates kebab-case naming conventions in web directory',
  },
  {
    name: 'API Standardization',
    script: 'validate-api-standardization-ast.ts',
    description: 'Validates API response format standardization',
  },
  {
    name: 'Response Envelopes',
    script: 'validate-response-envelopes-ast.ts',
    description: 'Validates response envelope patterns',
  },
  {
    name: 'Architecture Patterns',
    script: 'validate-architecture-patterns-ast.ts',
    description: 'Validates architectural consistency patterns',
  },
];

/**
 * Run a single validation script
 */
async function runValidation(scriptPath: string): Promise<{ passed: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['exec', 'tsx', scriptPath], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        passed: code === 0,
        output: output.trim(),
        error: error.trim() || undefined,
      });
    });

    child.on('error', (err) => {
      resolve({
        passed: false,
        output: '',
        error: err.message,
      });
    });
  });
}

/**
 * Main validation runner
 */
async function runAllValidations(): Promise<void> {
  const args = process.argv.slice(2);
  const showList = args.includes('--list');
  const quickMode = args.includes('--quick');

  if (showList) {
    console.log('📋 Available validation scripts:\n');
    VALIDATION_SCRIPTS.forEach((script, index) => {
      console.log(`${index + 1}. ${script.name}`);
      console.log(`   ${script.description}`);
      console.log(`   Script: ${script.script}\n`);
    });
    return;
  }

  console.log('🔍 Running all validation scripts...\n');

  const results: ValidationResult[] = [];
  const scriptsToRun = quickMode 
    ? VALIDATION_SCRIPTS.filter(s => ['validate-imports.ts', 'validate-file-naming.ts'].includes(s.script))
    : VALIDATION_SCRIPTS;

  // Run validations sequentially to avoid overwhelming output
  for (const script of scriptsToRun) {
    const scriptPath = path.join('scripts/validation', script.script);
    console.log(`🔍 Running: ${script.name}...`);

    const result = await runValidation(scriptPath);
    results.push({
      name: script.name,
      script: script.script,
      ...result,
    });

    if (result.passed) {
      console.log(`✅ ${script.name} - PASSED`);
    } else {
      console.log(`❌ ${script.name} - FAILED`);
      if (!quickMode) {
        console.log(result.output);
        if (result.error) {
          console.log(`Error: ${result.error}`);
        }
      }
    }
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = results.filter(r => !r.passed);

  console.log('📊 Validation Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (failed.length > 0) {
    console.log(`   Failed: ${failed.length}`);
    console.log('\n❌ Failed validations:');
    failed.forEach(result => {
      console.log(`   - ${result.name}`);
    });
    
    if (quickMode && failed.length > 0) {
      console.log('\n💡 Run without --quick flag to see detailed error messages');
    }
  }

  if (passed === total) {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some validations failed. Please review and fix the issues above.');
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllValidations().catch((error) => {
    console.error('💥 Validation runner failed:', error);
    process.exit(1);
  });
}

export { runAllValidations };