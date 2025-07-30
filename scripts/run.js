#!/usr/bin/env node

/**
 * Script Orchestrator
 * Main entry point for all project scripts with organized sub-commands
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPT_CATEGORIES = {
  validation: {
    description: 'Code quality and standardization validation',
    scripts: {
      all: 'validate-all.js',
      imports: 'validate-imports.js',
      api: 'validate-api-standardization-ast.js',
      envelopes: 'validate-response-envelopes-ast.js'
    }
  },
  database: {
    description: 'Database management and initialization',
    scripts: {
      init: 'init-db.sql'
    }
  }
};

function showHelp() {
  console.log(`
🛠️  Devlog Project Scripts

Usage: node scripts/run.js <category> <script> [options]

Categories:
`);

  Object.entries(SCRIPT_CATEGORIES).forEach(([category, config]) => {
    console.log(`\n📁 ${category} - ${config.description}`);
    Object.entries(config.scripts).forEach(([name, file]) => {
      console.log(`   ${name.padEnd(12)} - ${file}`);
    });
  });

  console.log(`
Examples:
  node scripts/run.js validation all
  node scripts/run.js validation api
  node scripts/run.js database init

Shortcuts (via package.json):
  pnpm validate        - validation all
  pnpm validate:api    - validation api
  pnpm validate:quick  - validation all --no-build --no-types
`);
}

function runScript(category, scriptName, args = []) {
  const categoryConfig = SCRIPT_CATEGORIES[category];
  if (!categoryConfig) {
    console.error(`❌ Unknown category: ${category}`);
    console.log(`Available categories: ${Object.keys(SCRIPT_CATEGORIES).join(', ')}`);
    process.exit(1);
  }

  const scriptFile = categoryConfig.scripts[scriptName];
  if (!scriptFile) {
    console.error(`❌ Unknown script: ${scriptName} in category ${category}`);
    console.log(`Available scripts in ${category}: ${Object.keys(categoryConfig.scripts).join(', ')}`);
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, category, scriptFile);
  const command = scriptFile.endsWith('.sh') 
    ? `bash ${scriptPath} ${args.join(' ')}`
    : `node ${scriptPath} ${args.join(' ')}`;

  console.log(`🚀 Running: ${category}/${scriptName}`);
  console.log(`📄 Script: ${scriptFile}`);
  console.log(`💻 Command: ${command}\n`);

  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error(`❌ Script failed with exit code: ${error.status}`);
    process.exit(error.status || 1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const [category, scriptName, ...scriptArgs] = args;

// Handle direct validation calls for backwards compatibility
if (category === 'validate') {
  const validationScript = scriptName || 'all';
  runScript('validation', validationScript, scriptArgs);
} else {
  runScript(category, scriptName, scriptArgs);
}
