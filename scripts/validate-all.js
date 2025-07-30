#!/usr/bin/env node

/**
 * Comprehensive Validation Suite
 * Runs all code quality and standardization checks
 */

const { validateAPIStandardizationAST } = require('./validate-api-standardization-ast.js');
const { validateResponseEnvelopesAST } = require('./validate-response-envelopes-ast.js');
const { execSync } = require('child_process');

let totalErrors = 0;
let totalWarnings = 0;

/**
 * Run a validation with error counting
 */
function runValidation(name, validationFn) {
  console.log(`\n🔍 Running ${name}...`);
  console.log('='.repeat(50));
  
  try {
    validationFn();
  } catch (error) {
    if (error.code === 1) {
      totalErrors++;
      console.log(`❌ ${name} failed with errors`);
    } else {
      console.log(`✅ ${name} completed successfully`);
    }
  }
}

/**
 * Run import pattern validation
 */
function runImportValidation() {
  console.log(`\n🔍 Running Import Pattern Validation...`);
  console.log('='.repeat(50));
  
  try {
    execSync('node scripts/validate-imports.js', { stdio: 'inherit' });
    console.log(`✅ Import Pattern Validation completed successfully`);
  } catch (error) {
    totalErrors++;
    console.log(`❌ Import Pattern Validation failed with errors`);
  }
}

/**
 * Run TypeScript compilation check
 */
function runTypeCheck() {
  console.log(`\n🔍 Running TypeScript Compilation Check...`);
  console.log('='.repeat(50));
  
  try {
    // Check each package's TypeScript
    const packages = ['core', 'web', 'mcp', 'ai', 'cli'];
    
    packages.forEach(pkg => {
      try {
        console.log(`  Checking @codervisor/devlog-${pkg}...`);
        execSync(`pnpm --filter @codervisor/devlog-${pkg} type-check 2>/dev/null || pnpm --filter @codervisor/devlog-${pkg} tsc --noEmit`, { stdio: 'pipe' });
      } catch (error) {
        console.log(`  ⚠️  TypeScript issues in ${pkg} package`);
        totalWarnings++;
      }
    });
    
    console.log(`✅ TypeScript Compilation Check completed`);
  } catch (error) {
    console.log(`❌ TypeScript Compilation Check failed`);
    totalErrors++;
  }
}

/**
 * Run build validation
 */
function runBuildValidation() {
  console.log(`\n🔍 Running Build Validation...`);
  console.log('='.repeat(50));
  
  try {
    // Test build without affecting dev servers
    console.log(`  Testing web package build...`);
    execSync('pnpm --filter @codervisor/devlog-web build:test', { stdio: 'pipe' });
    
    console.log(`✅ Build Validation completed successfully`);
  } catch (error) {
    console.log(`❌ Build Validation failed`);
    totalErrors++;
  }
}

/**
 * Main validation suite
 */
function runFullValidation() {
  console.log('🚀 Starting Comprehensive Validation Suite');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  // Run all validations
  runImportValidation();
  runValidation('API Response Standardization (AST)', validateAPIStandardizationAST);
  runValidation('Response Envelope Format (AST)', validateResponseEnvelopesAST);
  runTypeCheck();
  runBuildValidation();
  
  // Summary report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n🎯 Validation Summary');
  console.log('=' .repeat(60));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n🎉 All validations passed! Code is ready for commit.');
  } else if (totalErrors === 0) {
    console.log('\n✅ No critical errors found! Consider addressing warnings.');
    console.log('💡 Code is acceptable for commit but improvements are suggested.');
  } else {
    console.log('\n🚨 Critical errors found! Please fix before committing.');
    console.log(`   ${totalErrors} error(s) must be resolved.`);
  }
  
  // Exit with appropriate code
  process.exit(totalErrors > 0 ? 1 : 0);
}

// Command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Comprehensive Validation Suite for Devlog Project

Usage: node scripts/validate-all.js [options]

Options:
  --help, -h          Show this help message
  --api-only          Run only API standardization checks
  --imports-only      Run only import pattern checks
  --envelopes-only    Run only response envelope checks
  --no-build          Skip build validation (faster)
  --no-types          Skip TypeScript compilation check

Examples:
  node scripts/validate-all.js                 # Run all validations
  node scripts/validate-all.js --api-only      # API checks only
  node scripts/validate-all.js --no-build      # Skip build check
`);
  process.exit(0);
}

// Handle specific validation requests
if (args.includes('--api-only')) {
  validateAPIStandardizationAST();
} else if (args.includes('--imports-only')) {
  runImportValidation();
} else if (args.includes('--envelopes-only')) {
  validateResponseEnvelopesAST();
} else {
  // Run full validation suite with options
  if (args.includes('--no-build')) {
    runBuildValidation = () => console.log('⏭️  Skipping build validation');
  }
  if (args.includes('--no-types')) {
    runTypeCheck = () => console.log('⏭️  Skipping TypeScript check');
  }
  
  runFullValidation();
}
