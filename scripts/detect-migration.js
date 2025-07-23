#!/usr/bin/env node

/**
 * Automatic Migration Detection Script
 * Analyzes recent changes and detects potential cross-package migration needs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * High-impact files that often trigger migrations
 */
const MIGRATION_TRIGGERS = {
  core: {
    managers: 'packages/core/src/managers/**/*.ts',
    types: 'packages/core/src/types/**/*.ts', 
    storage: 'packages/core/src/storage/**/*.ts',
    events: 'packages/core/src/events/**/*.ts',
    services: 'packages/core/src/services/**/*.ts'
  }
};

/**
 * Cross-package dependency map
 */
const DEPENDENCY_MAP = {
  'packages/core/src/managers/': [
    'packages/mcp/src/mcp-adapter.ts',
    'packages/web/app/contexts/',
    'packages/web/app/api/'
  ],
  'packages/core/src/types/': [
    'packages/mcp/src/tools/',
    'packages/web/app/components/',
    'packages/web/app/api/'
  ],
  'packages/core/src/storage/': [
    'packages/mcp/src/tools/',
    'packages/web/app/api/'
  ]
};

/**
 * Get recently changed files
 */
function getRecentChanges(hours = 24) {
  try {
    const since = `${hours} hours ago`;
    const result = execSync(`git log --since="${since}" --name-only --pretty=format: | sort | uniq`, 
      { encoding: 'utf8' });
    return result.split('\n').filter(file => file.trim() && file.endsWith('.ts'));
  } catch (error) {
    console.log('ℹ️  No git history available, checking staged files...');
    try {
      const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      return staged.split('\n').filter(file => file.trim() && file.endsWith('.ts'));
    } catch {
      return [];
    }
  }
}

/**
 * Check if file is a migration trigger
 */
function isMigrationTrigger(filePath) {
  const triggers = [
    'packages/core/src/managers/',
    'packages/core/src/types/',
    'packages/core/src/storage/',
    'packages/core/src/events/',
    'packages/core/src/services/'
  ];
  
  return triggers.some(trigger => filePath.includes(trigger));
}

/**
 * Find affected packages for a core change
 */
function findAffectedPackages(filePath) {
  const affected = [];
  
  for (const [pattern, dependencies] of Object.entries(DEPENDENCY_MAP)) {
    if (filePath.includes(pattern)) {
      affected.push(...dependencies);
    }
  }
  
  return [...new Set(affected)];
}

/**
 * Search for usage of a class/interface across packages
 */
function searchUsage(className) {
  try {
    const result = execSync(
      `grep -r "${className}" packages/ --include="*.ts" --include="*.tsx" -l`,
      { encoding: 'utf8' }
    );
    return result.split('\n').filter(file => file.trim());
  } catch {
    return [];
  }
}

/**
 * Extract class names from TypeScript files
 */
function extractClassNames(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const classMatches = content.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g) || [];
    const interfaceMatches = content.match(/(?:export\s+)?interface\s+(\w+)/g) || [];
    const enumMatches = content.match(/(?:export\s+)?enum\s+(\w+)/g) || [];
    
    const classes = classMatches.map(match => match.match(/class\s+(\w+)/)[1]);
    const interfaces = interfaceMatches.map(match => match.match(/interface\s+(\w+)/)[1]);
    const enums = enumMatches.map(match => match.match(/enum\s+(\w+)/)[1]);
    
    return [...classes, ...interfaces, ...enums];
  } catch {
    return [];
  }
}

/**
 * Main migration detection function
 */
function detectMigrationNeeds() {
  console.log('🔍 Detecting automatic migration needs...\n');
  
  const recentChanges = getRecentChanges();
  const migrationTriggers = recentChanges.filter(isMigrationTrigger);
  
  if (migrationTriggers.length === 0) {
    console.log('✅ No migration triggers detected in recent changes.');
    return;
  }
  
  console.log(`⚠️  Found ${migrationTriggers.length} migration trigger(s):\n`);
  
  let hasIssues = false;
  
  for (const triggerFile of migrationTriggers) {
    console.log(`📁 ${triggerFile}`);
    
    // Extract class names from the changed file
    const classNames = extractClassNames(triggerFile);
    
    if (classNames.length === 0) {
      console.log('   ℹ️  No classes/interfaces detected\n');
      continue;
    }
    
    console.log(`   🏷️  Classes/Interfaces: ${classNames.join(', ')}`);
    
    // Find affected packages
    const affectedPackages = findAffectedPackages(triggerFile);
    console.log(`   📦 Potentially affected: ${affectedPackages.join(', ')}`);
    
    // Search for usage of each class
    for (const className of classNames) {
      const usageFiles = searchUsage(className);
      const crossPackageUsage = usageFiles.filter(file => 
        !file.includes('packages/core/') && file.includes('packages/')
      );
      
      if (crossPackageUsage.length > 0) {
        hasIssues = true;
        console.log(`   ⚠️  "${className}" used in other packages:`);
        crossPackageUsage.forEach(file => {
          console.log(`      - ${file}`);
        });
      }
    }
    console.log('');
  }
  
  if (hasIssues) {
    console.log('🚨 MIGRATION NEEDED: Core changes affect other packages');
    console.log('\n📋 Recommended actions:');
    console.log('1. Review affected files for compatibility');
    console.log('2. Update dependent packages as needed');
    console.log('3. Run build tests: pnpm --filter @devlog/mcp build && pnpm --filter @devlog/web build:test');
    console.log('4. Test integration workflows');
    console.log('\n💡 Use migration.prompt.md for systematic migration guidance');
    process.exit(1);
  } else {
    console.log('✅ Migration triggers found but no cross-package usage detected');
  }
}

// Run detection
detectMigrationNeeds();
