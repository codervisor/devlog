#!/usr/bin/env node

/**
 * Testing Standards Validation (AST-based)
 * Uses TypeScript compiler API to enforce testing patterns and standards
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ERRORS = [];
const WARNINGS = [];

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
    // Skip problematic nodes and continue
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
    return 1; // Fallback to line 1 if position cannot be determined
  }
}

/**
 * Get node text with error handling
 */
function getNodeText(sourceFile, node) {
  try {
    if (!sourceFile || !node) return '';
    return node.getText(sourceFile);
  } catch (error) {
    return ''; // Fallback to empty string
  }
}

/**
 * Check if file is a test file
 */
function isTestFile(filePath) {
  return filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/__tests__/');
}

/**
 * Get package name from file path
 */
function getPackageName(filePath) {
  const match = filePath.match(/packages\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Validate test file structure and organization
 */
function validateTestStructure(filePath, sourceFile) {
  let hasDescribeBlocks = false;
  let hasItBlocks = false;
  let hasBeforeEach = false;
  let hasAfterEach = false;
  let hasSetupTeardown = false;
  let hasVitest = false;
  let hasProperImports = false;
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check imports for testing frameworks
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      if (importPath === 'vitest' || importPath.includes('vitest')) {
        hasVitest = true;
        hasProperImports = true;
      }
    }
    
    // Check for test structure function calls
    if (ts.isCallExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text;
      
      switch (functionName) {
        case 'describe':
          hasDescribeBlocks = true;
          
          // Check describe block naming
          if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
            const describeName = node.arguments[0].text;
            if (!describeName || describeName.length < 3) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'TEST_DESCRIBE_NAMING',
                message: 'Describe block should have meaningful name',
                suggestion: 'Use descriptive names like "ComponentName" or "methodName"',
              });
            }
          }
          break;
          
        case 'it':
        case 'test':
          hasItBlocks = true;
          
          // Check test naming
          if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
            const testName = node.arguments[0].text;
            if (!testName.startsWith('should')) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'TEST_NAMING',
                message: 'Test name should start with "should"',
                suggestion: 'Use pattern: "should describe expected behavior"',
              });
            }
            
            if (testName.length < 10) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'TEST_NAME_TOO_SHORT',
                message: 'Test name too short - should be descriptive',
                suggestion: 'Clearly describe what behavior is being tested',
              });
            }
          }
          break;
          
        case 'beforeEach':
          hasBeforeEach = true;
          hasSetupTeardown = true;
          break;
          
        case 'afterEach':
          hasAfterEach = true;
          hasSetupTeardown = true;
          break;
          
        case 'beforeAll':
        case 'afterAll':
          hasSetupTeardown = true;
          break;
      }
    }
  });
  
  // File-level validations
  if (!hasProperImports) {
    ERRORS.push({
      file: filePath,
      line: 1,
      type: 'TEST_MISSING_FRAMEWORK',
      message: 'Test file missing testing framework imports',
      suggestion: 'Import vitest functions: import { describe, it, expect, beforeEach, afterEach } from "vitest"',
    });
  }
  
  if (!hasDescribeBlocks && hasItBlocks) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'TEST_NO_DESCRIBE',
      message: 'Test file should organize tests in describe blocks',
      suggestion: 'Group related tests using describe blocks for better organization',
    });
  }
  
  if (!hasItBlocks) {
    ERRORS.push({
      file: filePath,
      line: 1,
      type: 'TEST_NO_TESTS',
      message: 'Test file contains no test cases',
      suggestion: 'Add test cases using it() or test() functions',
    });
  }
}

/**
 * Validate test isolation patterns
 */
function validateTestIsolation(filePath, sourceFile) {
  let hasFileSystemOperations = false;
  let hasProcessCwdUsage = false;
  let hasEnvVarChanges = false;
  let hasProperCleanup = false;
  let hasTemporaryDirectories = false;
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    const nodeText = getNodeText(sourceFile, node);
    
    // Check for file system operations
    if (ts.isCallExpression(node) && node.expression && ts.isPropertyAccessExpression(node.expression)) {
      const objectName = getNodeText(sourceFile, node.expression.expression);
      const methodName = node.expression.name.text;
      
      if (objectName === 'fs' && ['writeFileSync', 'mkdirSync', 'rmSync', 'mkdtemp'].includes(methodName)) {
        hasFileSystemOperations = true;
        
        if (methodName === 'mkdtemp') {
          hasTemporaryDirectories = true;
        }
      }
    }
    
    // Check for process.cwd() usage
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'process' &&
        node.expression.name.text === 'cwd') {
      hasProcessCwdUsage = true;
    }
    
    // Check for environment variable changes
    if (ts.isBinaryExpression(node) && 
        ts.isPropertyAccessExpression(node.left) &&
        getNodeText(sourceFile, node.left).includes('process.env')) {
      hasEnvVarChanges = true;
    }
    
    // Check for proper cleanup in afterEach
    if (ts.isCallExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) &&
        node.expression.text === 'afterEach') {
      hasProperCleanup = true;
    }
  });
  
  // File-level validations for isolation
  if (hasFileSystemOperations && !hasTemporaryDirectories) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'TEST_FILE_OPERATIONS_NO_TEMP',
      message: 'File system operations should use temporary directories',
      suggestion: 'Use fs.mkdtemp() to create isolated test directories',
    });
  }
  
  if ((hasFileSystemOperations || hasProcessCwdUsage || hasEnvVarChanges) && !hasProperCleanup) {
    ERRORS.push({
      file: filePath,
      line: 1,
      type: 'TEST_MISSING_CLEANUP',
      message: 'Tests with side effects missing cleanup in afterEach',
      suggestion: 'Add afterEach block to restore original state (cwd, env, files)',
    });
  }
  
  if (hasProcessCwdUsage) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'TEST_PROCESS_CWD',
      message: 'Tests changing process.cwd() should store and restore original',
      suggestion: 'Store originalCwd = process.cwd() and restore in afterEach',
    });
  }
  
  if (hasEnvVarChanges) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'TEST_ENV_CHANGES',
      message: 'Tests modifying environment variables should restore them',
      suggestion: 'Store original process.env and restore in afterEach',
    });
  }
}

/**
 * Validate async test patterns
 */
function validateAsyncTestPatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check test function definitions for async patterns
    if (ts.isCallExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) &&
        ['it', 'test', 'beforeEach', 'afterEach'].includes(node.expression.text)) {
      
      // Get the test function (second argument)
      if (node.arguments.length > 1) {
        const testFunction = node.arguments[1];
        
        if (ts.isArrowFunction(testFunction) || ts.isFunctionExpression(testFunction)) {
          const isAsync = testFunction.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
          const functionBody = getNodeText(sourceFile, testFunction);
          
          // Check for await usage without async
          if (functionBody.includes('await') && !isAsync) {
            ERRORS.push({
              file: filePath,
              line: lineNum,
              type: 'TEST_AWAIT_WITHOUT_ASYNC',
              message: 'Test function uses await but is not async',
              suggestion: 'Mark test function as async when using await',
            });
          }
          
          // Check for Promise-returning methods without await
          if (functionBody.includes('.initialize(') || 
              functionBody.includes('.dispose(') ||
              functionBody.includes('.save(') ||
              functionBody.includes('.create(')) {
            if (!functionBody.includes('await') && isAsync) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'TEST_MISSING_AWAIT',
                message: 'Async test may be missing await on Promise-returning calls',
                suggestion: 'Ensure all async operations are properly awaited',
              });
            }
          }
          
          // Check for proper timeout handling
          if (isAsync && !functionBody.includes('timeout') && functionBody.length > 500) {
            WARNINGS.push({
              file: filePath,
              line: lineNum,
              type: 'TEST_LONG_ASYNC_NO_TIMEOUT',
              message: 'Long async test should consider timeout configuration',
              suggestion: 'Add timeout configuration for long-running async tests',
            });
          }
        }
      }
    }
  });
}

/**
 * Validate test assertions and expectations
 */
function validateTestAssertions(filePath, sourceFile) {
  let hasExpectCalls = false;
  let hasProperMatchers = false;
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check for expect() calls
    if (ts.isCallExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) &&
        node.expression.text === 'expect') {
      hasExpectCalls = true;
      
      // Check if expect is chained with proper matchers
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent)) {
        const matcher = parent.name.text;
        const validMatchers = [
          'toBe', 'toEqual', 'toBeNull', 'toBeUndefined', 'toBeDefined',
          'toBeTruthy', 'toBeFalsy', 'toContain', 'toHaveLength',
          'toThrow', 'toHaveBeenCalled', 'toHaveBeenCalledWith',
          'toBeInstanceOf', 'toMatchObject', 'toBeGreaterThan', 'toBeLessThan'
        ];
        
        if (validMatchers.includes(matcher)) {
          hasProperMatchers = true;
        } else {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'TEST_UNKNOWN_MATCHER',
            message: `Unknown or custom matcher: ${matcher}`,
            suggestion: 'Use standard Jest/Vitest matchers for better compatibility',
          });
        }
      }
    }
    
    // Check for async expect patterns
    if (ts.isAwaitExpression(node) && 
        ts.isCallExpression(node.expression) &&
        node.expression.expression && ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'expect') {
      
      // Look for .rejects or .resolves
      const expectCall = getNodeText(sourceFile, node);
      if (!expectCall.includes('.rejects') && !expectCall.includes('.resolves')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'TEST_ASYNC_EXPECT',
          message: 'Awaited expect should use .resolves or .rejects',
          suggestion: 'Use expect(promise).resolves.toBe() or expect(promise).rejects.toThrow()',
        });
      }
    }
  });
  
  // Check for tests without assertions
  if (isTestFile(filePath) && !hasExpectCalls) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'TEST_NO_ASSERTIONS',
      message: 'Test file contains no assertions',
      suggestion: 'Add expect() calls to verify test behavior',
    });
  }
}

/**
 * Validate mock and spy usage
 */
function validateMockPatterns(filePath, sourceFile) {
  let hasMocks = false;
  let hasSpies = false;
  let hasViMocks = false;
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check for mock imports
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      if (importPath === 'vitest' && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          const importName = element.name.text;
          if (['vi', 'mock', 'spyOn'].includes(importName)) {
            hasViMocks = true;
          }
        });
      }
    }
    
    // Check for mock function calls
    if (ts.isCallExpression(node) && node.expression) {
      const callText = getNodeText(sourceFile, node);
      
      if (callText.includes('vi.fn()') || callText.includes('vi.mock(')) {
        hasMocks = true;
        hasViMocks = true;
      }
      
      if (callText.includes('vi.spyOn(') || callText.includes('spyOn(')) {
        hasSpies = true;
        hasViMocks = true;
      }
    }
    
    // Check for global mock usage (should be avoided)
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression && ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'global') {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'TEST_GLOBAL_MOCK',
        message: 'Global mocks can cause test isolation issues',
        suggestion: 'Use local mocks or vi.mock() for better test isolation',
      });
    }
  });
  
  // Check for mock cleanup
  if ((hasMocks || hasSpies) && hasViMocks) {
    // Should have cleanup in afterEach
    let hasCleanup = false;
    
    visitNode(sourceFile, sourceFile, (node, sourceFile) => {
      if (ts.isCallExpression(node) && 
          node.expression && ts.isIdentifier(node.expression) &&
          node.expression.text === 'afterEach') {
        const cleanupText = getNodeText(sourceFile, node);
        if (cleanupText.includes('vi.clearAllMocks') || cleanupText.includes('vi.restoreAllMocks')) {
          hasCleanup = true;
        }
      }
    });
    
    if (!hasCleanup) {
      WARNINGS.push({
        file: filePath,
        line: 1,
        type: 'TEST_MOCK_NO_CLEANUP',
        message: 'Tests using mocks should clean up in afterEach',
        suggestion: 'Add vi.clearAllMocks() or vi.restoreAllMocks() in afterEach',
      });
    }
  }
}

/**
 * Validate files using AST
 */
function validateFilesWithAST(filePaths) {
  console.log(`🔍 Creating TypeScript program for ${filePaths.length} files...`);
  
  const program = createProgram(filePaths);
  
  filePaths.forEach(filePath => {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.warn(`⚠️  Could not parse ${filePath}`);
      return;
    }

    // Only validate test files
    if (isTestFile(filePath)) {
      validateTestStructure(filePath, sourceFile);
      validateTestIsolation(filePath, sourceFile);
      validateAsyncTestPatterns(filePath, sourceFile);
      validateTestAssertions(filePath, sourceFile);
      validateMockPatterns(filePath, sourceFile);
    }
  });
}

/**
 * Find test files in all packages
 */
function findTestFiles() {
  const files = [];

  function findFilesRecursive(dir, predicate) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', 'build', 'dist', '.next', '.next-build', 'coverage'].includes(entry)) {
          findFilesRecursive(fullPath, predicate);
        }
      } else if (predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Find test files in all packages
  const packagesDir = path.join(process.cwd(), 'packages');
  if (fs.existsSync(packagesDir)) {
    findFilesRecursive(packagesDir, (file) => 
      (file.endsWith('.ts') || file.endsWith('.tsx')) && 
      !file.endsWith('.d.ts') &&
      isTestFile(file)
    );
  }

  return files;
}

/**
 * Main validation function
 */
function validateTestingStandards() {
  console.log('🔍 Validating testing standards (AST-based)...');

  const files = findTestFiles();
  console.log(`  Found ${files.length} test files to analyze`);

  if (files.length === 0) {
    console.log('⚠️  No test files found - consider adding tests for better code quality');
    return;
  }

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} testing standard errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} testing standard warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All testing standards are followed!');
  } else if (!hasErrors) {
    console.log('✅ No critical testing standard errors found!');
    console.log('💡 Consider addressing warnings to improve test quality.');
  }

  // Only exit with error code for actual errors, not warnings
  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateTestingStandards();
}

module.exports = { validateTestingStandards };