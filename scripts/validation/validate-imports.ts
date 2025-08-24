#!/usr/bin/env -S pnpm exec tsx

/**
 * Custom import pattern validation for devlog monorepo
 * Validates ESM import patterns according to our coding standards
 */

import fs from 'fs';
import path from 'path';

interface ValidationError {
  file: string;
  line: number;
  message: string;
  suggestion: string;
}

const ERRORS: ValidationError[] = [];

/**
 * Validate import patterns in a TypeScript file
 */
function validateFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for import statements
    const importMatch = line.match(/^import\s+.*\s+from\s+['"](.+)['"];?\s*(.*)$/);
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
      // Check if we're in apps/web (where @/ is allowed for Next.js)
      if (!filePath.includes('apps/web/')) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          message: `Avoid self-referencing @/ alias: ${importPath}`,
          suggestion: `Use relative imports (./ or ../) within the same package`,
        });
      }
    }

    // Rule 3: Cross-package imports validation
    if (isRelativeImport && importPath.includes('../../../')) {
      // Check if this is actually a cross-package import by resolving the path
      if (filePath.includes('packages/')) {
        const currentPackageMatch = filePath.match(/packages\/([^\/]+)\//);
        if (currentPackageMatch) {
          const currentPackage = currentPackageMatch[1];

          // Resolve the relative path to see if it crosses package boundaries
          const importSegments = importPath.split('/');
          let currentDir = filePath.split('/');
          currentDir.pop(); // Remove filename

          for (const segment of importSegments) {
            if (segment === '..') {
              currentDir.pop();
            } else if (segment !== '.') {
              currentDir.push(segment);
            }
          }

          const resolvedPath = currentDir.join('/');
          const targetPackageMatch = resolvedPath.match(/packages\/([^\/]+)\//);

          // Only flag if it actually crosses package boundaries
          if (targetPackageMatch && targetPackageMatch[1] !== currentPackage) {
            const targetPackage = targetPackageMatch[1];
            ERRORS.push({
              file: filePath,
              line: lineNum,
              message: `Use @codervisor/devlog-* for cross-package imports instead of deep relative paths: ${importPath}`,
              suggestion: `Replace with @codervisor/devlog-${targetPackage}`,
            });
          }
        }
      }
    }

    // Rule 3b: Validate proper cross-package import naming
    if (importPath.startsWith('@devlog/') || importPath.startsWith('@codervisor/devlog-')) {
      // Check for old incorrect @devlog/ pattern
      if (importPath.startsWith('@devlog/')) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          message: `Use @codervisor/devlog-* instead of @devlog/*: ${importPath}`,
          suggestion: `Replace @devlog/ with @codervisor/devlog-`,
        });
      }

      // Validate that cross-package imports reference actual packages
      const validPackages = ['core', 'mcp', 'web', 'ai', 'cli'];
      const packageMatch = importPath.match(/^@codervisor\/devlog-([^\/]+)/);
      if (packageMatch) {
        const packageName = packageMatch[1];
        if (!validPackages.includes(packageName)) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            message: `Invalid package name in cross-package import: @codervisor/devlog-${packageName}`,
            suggestion: `Valid packages are: ${validPackages.map((p) => `@codervisor/devlog-${p}`).join(', ')}`,
          });
        }
      }
    }

    // Rule 3c: Detect potential cross-package relative imports
    if (isRelativeImport && importPath.includes('../') && filePath.includes('packages/')) {
      // Extract current package name from file path
      const currentPackageMatch = filePath.match(/packages\/([^\/]+)\//);
      if (currentPackageMatch) {
        const currentPackage = currentPackageMatch[1];

        // Check if the relative import might be going to a different package
        const importSegments = importPath.split('/');
        let currentDir = filePath.split('/');
        currentDir.pop(); // Remove filename

        // Resolve the relative path
        for (const segment of importSegments) {
          if (segment === '..') {
            currentDir.pop();
          } else if (segment !== '.') {
            currentDir.push(segment);
          }
        }

        const resolvedPath = currentDir.join('/');
        const targetPackageMatch = resolvedPath.match(/packages\/([^\/]+)\//);

        if (targetPackageMatch && targetPackageMatch[1] !== currentPackage) {
          const targetPackage = targetPackageMatch[1];
          ERRORS.push({
            file: filePath,
            line: lineNum,
            message: `Cross-package relative import from ${currentPackage} to ${targetPackage}: ${importPath}`,
            suggestion: `Use @codervisor/devlog-${targetPackage} instead of relative paths for cross-package imports`,
          });
        }
      }
    }
  });
}

/**
 * Recursively find TypeScript files
 */
function findTSFiles(dir: string, files: string[] = []): string[] {
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
function validateImportPatterns(): void {
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
