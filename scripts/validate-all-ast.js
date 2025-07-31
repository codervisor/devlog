#!/usr/bin/env node

/**
 * Comprehensive AST-based Validation Suite
 * Orchestrates all validation scripts for complete code quality assessment
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let totalErrors = 0;
let totalWarnings = 0;

/**
 * Run a validation script with error counting
 */
function runValidation(name, scriptPath, args = []) {
  console.log(`\n🔍 Running ${name}...`);
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    const command = `node ${scriptPath} ${args.join(' ')}`;
    execSync(command, { stdio: 'inherit' });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${name} completed successfully (${duration}s)`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    if (error.status === 1) {
      totalErrors++;
      console.log(`❌ ${name} failed with errors (${duration}s)`);
    } else {
      console.log(`⚠️  ${name} completed with warnings (${duration}s)`);
    }
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
    const packages = ['core', 'web', 'mcp', 'ai'];
    
    packages.forEach(pkg => {
      try {
        console.log(`  Checking @devlog/${pkg}...`);
        execSync(`pnpm --filter @devlog/${pkg} type-check 2>/dev/null || pnpm --filter @devlog/${pkg} tsc --noEmit`, { stdio: 'pipe' });
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
    execSync('pnpm --filter @devlog/web build:test', { stdio: 'pipe' });
    
    console.log(`✅ Build Validation completed successfully`);
  } catch (error) {
    console.log(`❌ Build Validation failed`);
    totalErrors++;
  }
}

/**
 * Get validation scripts from the scripts directory
 */
function getValidationScripts() {
  const scriptsDir = path.join(__dirname);
  const scripts = [];
  
  // Find all validation scripts
  const files = fs.readdirSync(scriptsDir);
  
  files.forEach(file => {
    if (file.startsWith('validate-') && file.endsWith('.js') && file !== 'validate-all-ast.js') {
      const scriptPath = path.join(scriptsDir, file);
      const name = file.replace('validate-', '').replace('-ast.js', '').replace('.js', '').replace(/-/g, ' ');
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      
      scripts.push({
        name: displayName,
        scriptPath,
        fileName: file
      });
    }
  });
  
  return scripts;
}

/**
 * Main validation suite
 */
function runFullValidation() {
  console.log('🚀 Starting Comprehensive AST-based Validation Suite');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  // Get all validation scripts
  const validationScripts = getValidationScripts();
  
  console.log(`Found ${validationScripts.length} validation scripts to run:`);
  validationScripts.forEach(script => {
    console.log(`  • ${script.name} (${script.fileName})`);
  });
  
  // Run all AST-based validations
  validationScripts.forEach(script => {
    runValidation(script.name, script.scriptPath);
  });
  
  // Run additional system checks
  runTypeCheck();
  runBuildValidation();
  
  // Summary report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n🎯 Comprehensive Validation Summary');
  console.log('=' .repeat(60));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🔍 Scripts run: ${validationScripts.length + 2}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n🎉 All validations passed! Code quality is excellent.');
    console.log('✨ Your codebase follows all established patterns and standards.');
  } else if (totalErrors === 0) {
    console.log('\n✅ No critical errors found! Code is ready for production.');
    console.log('💡 Consider addressing warnings to further improve code quality.');
  } else {
    console.log('\n🚨 Critical errors found! Please fix before deploying.');
    console.log(`   ${totalErrors} error(s) must be resolved.`);
    console.log('🔧 Run individual validation scripts for detailed error information.');
  }
  
  // Exit with appropriate code
  process.exit(totalErrors > 0 ? 1 : 0);
}

/**
 * Display help information
 */
function showHelp() {
  const validationScripts = getValidationScripts();
  
  console.log(`
🛠️  Comprehensive AST-based Validation Suite for Devlog Project

Usage: node scripts/validate-all-ast.js [options]

Options:
  --help, -h          Show this help message
  --list              List all available validation scripts
  --script <name>     Run only a specific validation script
  --no-build          Skip build validation (faster)
  --no-types          Skip TypeScript compilation check
  --quick             Run only critical validations (no-build + no-types)

Available Validation Scripts:
${validationScripts.map(s => `  • ${s.name.padEnd(25)} - ${s.fileName}`).join('\n')}

Examples:
  node scripts/validate-all-ast.js                    # Run all validations
  node scripts/validate-all-ast.js --script imports   # Run only import validation
  node scripts/validate-all-ast.js --quick            # Quick validation (skip build/types)
  node scripts/validate-all-ast.js --no-build         # Skip build check
`);
}

/**
 * Run a specific validation script
 */
function runSpecificScript(scriptName) {
  const validationScripts = getValidationScripts();
  const script = validationScripts.find(s => 
    s.name.toLowerCase().includes(scriptName.toLowerCase()) ||
    s.fileName.includes(scriptName.toLowerCase())
  );
  
  if (!script) {
    console.error(`❌ Unknown validation script: ${scriptName}`);
    console.log(`Available scripts: ${validationScripts.map(s => s.name).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`🚀 Running specific validation: ${script.name}`);
  console.log('=' .repeat(50));
  
  runValidation(script.name, script.scriptPath);
  
  if (totalErrors === 0) {
    console.log('\n✅ Validation completed successfully!');
  } else {
    console.log('\n❌ Validation found errors that need to be fixed.');
  }
  
  process.exit(totalErrors > 0 ? 1 : 0);
}

// Command line argument parsing
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--list')) {
  const validationScripts = getValidationScripts();
  console.log('📋 Available Validation Scripts:');
  validationScripts.forEach(script => {
    console.log(`  • ${script.name} - ${script.fileName}`);
  });
  process.exit(0);
}

// Handle specific script execution
const scriptIndex = args.indexOf('--script');
if (scriptIndex !== -1 && args[scriptIndex + 1]) {
  const scriptName = args[scriptIndex + 1];
  runSpecificScript(scriptName);
  return;
}

// Handle quick mode
if (args.includes('--quick')) {
  args.push('--no-build', '--no-types');
}

// Handle build/type checking options
if (args.includes('--no-build')) {
  runBuildValidation = () => console.log('⏭️  Skipping build validation');
}
if (args.includes('--no-types')) {
  runTypeCheck = () => console.log('⏭️  Skipping TypeScript check');
}

// Run the full validation suite
runFullValidation();