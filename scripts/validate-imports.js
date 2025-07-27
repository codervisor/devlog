#!/usr/bin/env node

/**
 * Custom import pattern validation for devlog monorepo
 * Validates ESM import patterns according to our coding standards
 */

const fs = require('fs');
const path = require('path');

const ERRORS = [];

/**
 * Validate import patterns in a TypeScript file
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for import statements
    const importMatch = line.match(/^import\s+.*\s+from\s+['"](.+)['"];?\s*$/);
    if (!importMatch) return;

    const importPath = importMatch[1];
    const isRelativeImport = importPath.startsWith('./') || importPath.startsWith('../');
    const isTypeOnlyImport = line.includes('import type');

    // Rule 1: Relative imports must have .js extension (except for index files)
    if (isRelativeImport && !importPath.includes('node_modules')) {
      // Allow index.js imports
      if (
        importPath.endsWith('/index.js') ||
        importPath === './index.js' ||
        importPath === '../index.js'
      ) {
        return; // Valid
      }

      // Allow type-only imports to omit .js for now (can be stricter later)
      if (isTypeOnlyImport && (importPath.endsWith('.js') || importPath.endsWith('/index'))) {
        return; // Valid
      }

      // Non-index imports must have .js extension
      if (!importPath.endsWith('.js') && !importPath.endsWith('/index')) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          message: `Relative import missing .js extension: ${importPath}`,
          suggestion: `Add .js extension or use /index.js for barrel imports`,
        });
      }
    }

    // Rule 2: Avoid self-referencing @/ aliases within same package
    if (importPath.startsWith('@/')) {
      // Check if we're in packages/web (where @/ is allowed for Next.js)
      if (!filePath.includes('packages/web/')) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          message: `Avoid self-referencing @/ alias: ${importPath}`,
          suggestion: `Use relative imports (./ or ../) within the same package`,
        });
      }
    }

    // Rule 3: Cross-package imports should use @devlog/*
    if (isRelativeImport && importPath.includes('../../../')) {
      ERRORS.push({
        file: filePath,
        line: lineNum,
        message: `Use @devlog/* for cross-package imports instead of deep relative paths: ${importPath}`,
        suggestion: `Replace with @codervisor/devlog-core, @codervisor/devlog-mcp, etc.`,
      });
    }
  });
}

/**
 * Recursively find TypeScript files
 */
function findTSFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, build, .next directories
      if (!['node_modules', 'build', 'dist', '.next', '.next-build', 'coverage'].includes(entry)) {
        findTSFiles(fullPath, files);
      }
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      // Skip .d.ts files
      if (!entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main validation function
 */
function validateImportPatterns() {
  console.log('🔍 Validating import patterns...');

  const packagesDir = path.join(process.cwd(), 'packages');
  const packages = fs.readdirSync(packagesDir);

  for (const pkg of packages) {
    const pkgPath = path.join(packagesDir, pkg);
    if (fs.statSync(pkgPath).isDirectory()) {
      const srcPath = path.join(pkgPath, 'src');
      if (fs.existsSync(srcPath)) {
        console.log(`  Checking package: ${pkg}`);
        const files = findTSFiles(srcPath);
        files.forEach(validateFile);
      }
    }
  }

  // Report results
  if (ERRORS.length === 0) {
    console.log('✅ All import patterns are valid!');
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${ERRORS.length} import pattern issues:\n`);

    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line}`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });

    process.exit(1);
  }
}

// Run validation
validateImportPatterns();
