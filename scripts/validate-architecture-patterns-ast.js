#!/usr/bin/env node

/**
 * Dynamic Architecture Patterns Validation (AST-based)
 * 
 * This validation script dynamically discovers and validates architectural patterns
 * in the codebase rather than enforcing hardcoded assumptions.
 * 
 * Key improvements:
 * - Discovers actual patterns used in the codebase
 * - Validates consistency rather than enforcing rigid rules
 * - Adaptable to different architectural styles
 * - No hardcoded class names or method expectations
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ERRORS = [];
const WARNINGS = [];
const DISCOVERED_PATTERNS = {
  managerClasses: new Map(), // className -> { hasInitialize, hasDispose, hasCleanup, constructorParams }
  serviceClasses: new Map(),
  providerClasses: new Map(),
  lifecycleMethods: new Set(), // All cleanup methods found (dispose, cleanup, destroy, etc.)
  initializationMethods: new Set(), // All init methods found (initialize, init, setup, etc.)
};

/**
 * Create TypeScript program for AST analysis
 */
function createProgram(filePaths) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    strict: false,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    noEmit: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  };

  const host = ts.createCompilerHost(compilerOptions);
  return ts.createProgram(filePaths, compilerOptions, host);
}

/**
 * Visit AST nodes recursively with proper error handling
 */
function visitNode(node, sourceFile, visitor) {
  try {
    visitor(node, sourceFile);
    node.forEachChild(child => visitNode(child, sourceFile, visitor));
  } catch (error) {
    console.warn(`⚠️  Skipping problematic node in ${sourceFile.fileName}: ${error.message}`);
  }
}

/**
 * Get line number from AST node with error handling
 */
function getLineNumber(sourceFile, node) {
  try {
    if (!sourceFile || !node) return 1;
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return lineAndChar.line + 1;
  } catch (error) {
    return 1;
  }
}

/**
 * Dynamic pattern detection - discover what patterns are actually used
 */
function discoverPatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    // Discover class patterns
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const classInfo = {
        filePath,
        lineNumber: getLineNumber(sourceFile, node),
        hasInitialize: false,
        hasCleanup: false,
        hasDispose: false,
        initMethods: [],
        cleanupMethods: [],
        constructorParams: 0,
        isExported: false,
        isAbstract: false,
        extendsClass: null,
        implementsInterfaces: [],
      };

      // Check modifiers
      if (node.modifiers) {
        classInfo.isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        classInfo.isAbstract = node.modifiers.some(m => m.kind === ts.SyntaxKind.AbstractKeyword);
      }

      // Check inheritance
      if (node.heritageClauses) {
        node.heritageClauses.forEach(clause => {
          if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            clause.types.forEach(type => {
              if (ts.isIdentifier(type.expression)) {
                classInfo.extendsClass = type.expression.text;
              }
            });
          } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
            clause.types.forEach(type => {
              if (ts.isIdentifier(type.expression)) {
                classInfo.implementsInterfaces.push(type.expression.text);
              }
            });
          }
        });
      }

      // Analyze constructor and methods
      node.members.forEach(member => {
        if (ts.isConstructorDeclaration(member)) {
          classInfo.constructorParams = member.parameters ? member.parameters.length : 0;
        } else if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const methodName = member.name.text;
          const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
          
          // Discover initialization patterns
          if (['initialize', 'init', 'setup', 'start'].includes(methodName)) {
            classInfo.initMethods.push({ name: methodName, isAsync });
            DISCOVERED_PATTERNS.initializationMethods.add(methodName);
            if (methodName === 'initialize') classInfo.hasInitialize = true;
          }
          
          // Discover cleanup patterns
          if (['dispose', 'cleanup', 'destroy', 'close', 'shutdown', 'stop'].includes(methodName)) {
            classInfo.cleanupMethods.push({ name: methodName, isAsync });
            DISCOVERED_PATTERNS.lifecycleMethods.add(methodName);
            if (methodName === 'dispose') classInfo.hasDispose = true;
            if (methodName === 'cleanup') classInfo.hasCleanup = true;
          }
        }
      });

      // Categorize classes by naming patterns
      if (className.endsWith('Manager') || className.includes('Manager')) {
        DISCOVERED_PATTERNS.managerClasses.set(className, classInfo);
      } else if (className.endsWith('Service') || className.includes('Service')) {
        DISCOVERED_PATTERNS.serviceClasses.set(className, classInfo);
      } else if (className.endsWith('Provider') || className.includes('Provider')) {
        DISCOVERED_PATTERNS.providerClasses.set(className, classInfo);
      }
    }
  });
}

/**
 * Analyze discovered patterns and identify inconsistencies
 */
function validatePatternConsistency() {
  // Analyze manager patterns
  const managerClasses = Array.from(DISCOVERED_PATTERNS.managerClasses.values());
  if (managerClasses.length > 0) {
    console.log(`📊 Discovered ${managerClasses.length} manager classes`);
    
    // Find common initialization patterns
    const initPatterns = new Map();
    const cleanupPatterns = new Map();
    
    managerClasses.forEach(manager => {
      manager.initMethods.forEach(method => {
        const key = `${method.name}:${method.isAsync}`;
        initPatterns.set(key, (initPatterns.get(key) || 0) + 1);
      });
      
      manager.cleanupMethods.forEach(method => {
        const key = `${method.name}:${method.isAsync}`;
        cleanupPatterns.set(key, (cleanupPatterns.get(key) || 0) + 1);
      });
    });

    console.log(`🔍 Initialization patterns found:`);
    for (const [pattern, count] of initPatterns.entries()) {
      console.log(`  - ${pattern}: ${count} classes`);
    }

    console.log(`🔍 Cleanup patterns found:`);
    for (const [pattern, count] of cleanupPatterns.entries()) {
      console.log(`  - ${pattern}: ${count} classes`);
    }

    // Validate consistency within discovered patterns
    validateManagerConsistency(managerClasses, initPatterns, cleanupPatterns);
  }

  // Analyze service patterns
  const serviceClasses = Array.from(DISCOVERED_PATTERNS.serviceClasses.values());
  if (serviceClasses.length > 0) {
    console.log(`📊 Discovered ${serviceClasses.length} service classes`);
    validateServiceConsistency(serviceClasses);
  }

  // Analyze provider patterns
  const providerClasses = Array.from(DISCOVERED_PATTERNS.providerClasses.values());
  if (providerClasses.length > 0) {
    console.log(`📊 Discovered ${providerClasses.length} provider classes`);
    validateProviderConsistency(providerClasses);
  }
}

/**
 * Validate consistency among manager classes based on their category
 */
function validateManagerConsistency(managers, initPatterns, cleanupPatterns) {
  // Categorize managers by type based on their class names and interfaces
  const workspaceManagers = managers.filter(m => {
    const className = [...DISCOVERED_PATTERNS.managerClasses.entries()]
      .find(([name, info]) => info === m)?.[0] || '';
    return className.toLowerCase().includes('workspace');
  });
  
  const storageManagers = managers.filter(m => {
    const className = [...DISCOVERED_PATTERNS.managerClasses.entries()]
      .find(([name, info]) => info === m)?.[0] || '';
    return className.toLowerCase().includes('storage') || m.filePath.includes('/storage/');
  });
  
  const otherManagers = managers.filter(m => !workspaceManagers.includes(m) && !storageManagers.includes(m));

  console.log(`🎯 Manager Categories:`);
  console.log(`   Workspace managers: ${workspaceManagers.length}`);
  console.log(`   Storage managers: ${storageManagers.length}`);
  console.log(`   Other managers: ${otherManagers.length}`);

  // Validate each category separately
  validateManagerCategory(workspaceManagers, 'Workspace', initPatterns, cleanupPatterns);
  validateManagerCategory(storageManagers, 'Storage', initPatterns, cleanupPatterns);
  validateManagerCategory(otherManagers, 'Other', initPatterns, cleanupPatterns);
}

/**
 * Validate a specific category of managers
 */
function validateManagerCategory(managers, categoryName, allInitPatterns, allCleanupPatterns) {
  if (managers.length === 0) return;

  console.log(`\n🔍 Validating ${categoryName} managers...`);

  // Find patterns within this category
  const categoryInitPatterns = new Map();
  const categoryCleanupPatterns = new Map();
  
  managers.forEach(manager => {
    manager.initMethods.forEach(method => {
      const key = `${method.name}:${method.isAsync}`;
      categoryInitPatterns.set(key, (categoryInitPatterns.get(key) || 0) + 1);
    });
    
    manager.cleanupMethods.forEach(method => {
      const key = `${method.name}:${method.isAsync}`;
      categoryCleanupPatterns.set(key, (categoryCleanupPatterns.get(key) || 0) + 1);
    });
  });

  const primaryInitPattern = [...categoryInitPatterns.entries()].sort((a, b) => b[1] - a[1])[0];
  const primaryCleanupPattern = [...categoryCleanupPatterns.entries()].sort((a, b) => b[1] - a[1])[0];

  console.log(`   Primary init pattern: ${primaryInitPattern ? primaryInitPattern[0] : 'none'}`);
  console.log(`   Primary cleanup pattern: ${primaryCleanupPattern ? primaryCleanupPattern[0] : 'none'}`);

  managers.forEach(manager => {
    const className = [...DISCOVERED_PATTERNS.managerClasses.entries()]
      .find(([name, info]) => info === manager)?.[0] || 'Unknown';

    // Only require lifecycle methods if other managers in this category have them
    if (primaryInitPattern && manager.initMethods.length === 0) {
      ERRORS.push({
        file: manager.filePath,
        line: manager.lineNumber,
        type: 'MANAGER_MISSING_INIT',
        message: `${categoryName} manager "${className}" missing initialization method`,
        suggestion: `Add ${primaryInitPattern[0].split(':')[0]}() method (pattern used by ${primaryInitPattern[1]} other ${categoryName.toLowerCase()} managers)`,
      });
    }

    if (primaryCleanupPattern && manager.cleanupMethods.length === 0) {
      // Only flag as error if this category consistently uses cleanup methods
      if (primaryCleanupPattern[1] > 1 || managers.length === 1) {
        ERRORS.push({
          file: manager.filePath,
          line: manager.lineNumber,
          type: 'MANAGER_MISSING_CLEANUP',
          message: `${categoryName} manager "${className}" missing cleanup method`,
          suggestion: `Add ${primaryCleanupPattern[0].split(':')[0]}() method (pattern used by ${primaryCleanupPattern[1]} other ${categoryName.toLowerCase()} managers)`,
        });
      } else {
        WARNINGS.push({
          file: manager.filePath,
          line: manager.lineNumber,
          type: 'MANAGER_INCONSISTENT_CLEANUP',
          message: `${categoryName} manager "${className}" missing cleanup method`,
          suggestion: `Consider adding ${primaryCleanupPattern[0].split(':')[0]}() method for consistency`,
        });
      }
    }

    // Check for inconsistent patterns within the category
    manager.cleanupMethods.forEach(method => {
      const pattern = `${method.name}:${method.isAsync}`;
      if (primaryCleanupPattern && pattern !== primaryCleanupPattern[0] && categoryCleanupPatterns.size > 1) {
        WARNINGS.push({
          file: manager.filePath,
          line: manager.lineNumber,
          type: 'MANAGER_INCONSISTENT_CLEANUP',
          message: `${categoryName} manager "${className}" uses ${pattern} but category standard is ${primaryCleanupPattern[0]}`,
          suggestion: `Consider standardizing on ${primaryCleanupPattern[0]} within ${categoryName.toLowerCase()} managers`,
        });
      }
    });

    // General manager validations
    if (!manager.isExported) {
      WARNINGS.push({
        file: manager.filePath,
        line: manager.lineNumber,
        type: 'MANAGER_NOT_EXPORTED',
        message: `Manager class "${className}" should be exported`,
        suggestion: 'Export manager classes for use by other packages',
      });
    }

    // Only warn about DI for non-utility managers
    if (manager.constructorParams === 0 && !className.toLowerCase().includes('factory')) {
      WARNINGS.push({
        file: manager.filePath,
        line: manager.lineNumber,
        type: 'MANAGER_NO_DI',
        message: `Manager class "${className}" has no constructor dependencies`,
        suggestion: 'Consider dependency injection for better testability',
      });
    }
  });
}

/**
 * Validate service class consistency
 */
function validateServiceConsistency(services) {
  services.forEach(service => {
    const className = [...DISCOVERED_PATTERNS.serviceClasses.entries()]
      .find(([name, info]) => info === service)?.[0] || 'Unknown';

    // Services should generally be stateless
    if (service.constructorParams > 5) {
      WARNINGS.push({
        file: service.filePath,
        line: service.lineNumber,
        type: 'SERVICE_TOO_MANY_DEPS',
        message: `Service "${className}" has many constructor dependencies (${service.constructorParams})`,
        suggestion: 'Consider breaking into smaller services or using composition',
      });
    }
  });
}

/**
 * Validate provider class consistency
 */
function validateProviderConsistency(providers) {
  providers.forEach(provider => {
    const className = [...DISCOVERED_PATTERNS.providerClasses.entries()]
      .find(([name, info]) => info === provider)?.[0] || 'Unknown';

    // Providers should have lifecycle methods
    if (provider.initMethods.length === 0 && provider.cleanupMethods.length === 0) {
      WARNINGS.push({
        file: provider.filePath,
        line: provider.lineNumber,
        type: 'PROVIDER_NO_LIFECYCLE',
        message: `Provider "${className}" has no lifecycle management`,
        suggestion: 'Consider adding initialization and cleanup methods',
      });
    }

    // Check for base class extension
    if (!provider.extendsClass?.includes('Base') && className !== 'BaseStorageProvider') {
      WARNINGS.push({
        file: provider.filePath,
        line: provider.lineNumber,
        type: 'PROVIDER_NO_BASE',
        message: `Provider "${className}" should extend a base provider class`,
        suggestion: 'Extend base provider for consistent interface',
      });
    }
  });
}

/**
 * Find TypeScript files in all packages
 */
function findArchitectureFiles() {
  const files = [];

  function findFilesRecursive(dir, predicate) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', 'build', 'dist', '.next', '.next-build', 'coverage', '__tests__'].includes(entry)) {
          findFilesRecursive(fullPath, predicate);
        }
      } else if (predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Find TypeScript files in all packages
  const packagesDir = path.join(process.cwd(), 'packages');
  if (fs.existsSync(packagesDir)) {
    findFilesRecursive(packagesDir, (file) => 
      (file.endsWith('.ts') || file.endsWith('.tsx')) && 
      !file.endsWith('.d.ts') &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    );
  }

  return files;
}

/**
 * Discovery phase - analyze all files to understand current patterns
 */
function runDiscoveryPhase(filePaths) {
  console.log('🔍 Phase 1: Discovering architectural patterns...');
  
  const program = createProgram(filePaths);
  
  filePaths.forEach(filePath => {
    const sourceFile = program.getSourceFile(filePath);
    if (sourceFile) {
      discoverPatterns(filePath, sourceFile);
    }
  });
}

/**
 * Validation phase - check consistency based on discovered patterns
 */
function runValidationPhase() {
  console.log('\n🔍 Phase 2: Validating pattern consistency...');
  validatePatternConsistency();
}

/**
 * Main validation function
 */
function validateArchitecturePatterns() {
  console.log('🚀 Dynamic Architecture Patterns Validation');
  console.log('   Discovering and validating actual codebase patterns...\n');

  const files = findArchitectureFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze\n`);

  // Phase 1: Discovery
  runDiscoveryPhase(files);

  // Phase 2: Validation
  runValidationPhase();

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} consistency errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} consistency warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All architectural patterns are consistent!');
  } else if (!hasErrors) {
    console.log('✅ No critical consistency errors found!');
    console.log('💡 Consider addressing warnings to improve architecture consistency.');
  }

  // Summary of discovered patterns
  console.log('\n📊 Pattern Discovery Summary:');
  console.log(`   Manager classes: ${DISCOVERED_PATTERNS.managerClasses.size}`);
  console.log(`   Service classes: ${DISCOVERED_PATTERNS.serviceClasses.size}`);
  console.log(`   Provider classes: ${DISCOVERED_PATTERNS.providerClasses.size}`);
  console.log(`   Initialization methods: ${Array.from(DISCOVERED_PATTERNS.initializationMethods).join(', ')}`);
  console.log(`   Cleanup methods: ${Array.from(DISCOVERED_PATTERNS.lifecycleMethods).join(', ')}`);

  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateArchitecturePatterns();
}

module.exports = { validateArchitecturePatterns };