#!/usr/bin/env node

/**
 * Security and Performance Validation (AST-based)
 * Uses TypeScript compiler API to detect security issues and performance anti-patterns
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
 * Get package name from file path
 */
function getPackageName(filePath) {
  const match = filePath.match(/packages\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Validate security patterns
 */
function validateSecurity(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    const nodeText = getNodeText(sourceFile, node);
    
    // Check for potential XSS vulnerabilities (innerHTML usage)
    if (ts.isPropertyAccessExpression(node) && 
        node.name.text === 'innerHTML') {
      ERRORS.push({
        file: filePath,
        line: lineNum,
        type: 'SECURITY_XSS_INNERHTML',
        message: 'Potential XSS vulnerability - avoid innerHTML with user data',
        suggestion: 'Use textContent, createElement, or sanitize input before innerHTML',
      });
    }
    
    // Check for eval() usage
    if (ts.isCallExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) &&
        node.expression.text === 'eval') {
      ERRORS.push({
        file: filePath,
        line: lineNum,
        type: 'SECURITY_EVAL',
        message: 'eval() usage is a security risk',
        suggestion: 'Use JSON.parse() for data or refactor to avoid eval()',
      });
    }
    
    // Check for Function constructor
    if (ts.isNewExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) &&
        node.expression.text === 'Function') {
      ERRORS.push({
        file: filePath,
        line: lineNum,
        type: 'SECURITY_FUNCTION_CONSTRUCTOR',
        message: 'Function constructor can be a security risk',
        suggestion: 'Use regular function declarations or arrow functions',
      });
    }
    
    // Check for dangerous regex patterns (ReDoS)
    if (ts.isRegularExpressionLiteral(node)) {
      const regexText = node.text;
      
      // Check for nested quantifiers (potential ReDoS)
      if (regexText.includes('(.*)*') || regexText.includes('(.*)+') || regexText.includes('(.+)*')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'SECURITY_REGEX_REDOS',
          message: 'Regex pattern may be vulnerable to ReDoS attacks',
          suggestion: 'Avoid nested quantifiers and use more specific patterns',
        });
      }
      
      // Check for overly broad patterns
      if (regexText.includes('.*') && regexText.length < 10) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'SECURITY_REGEX_BROAD',
          message: 'Overly broad regex pattern',
          suggestion: 'Use more specific patterns to avoid performance issues',
        });
      }
    }
    
    // Check for hardcoded secrets (basic patterns)
    if (ts.isStringLiteral(node)) {
      const stringValue = node.text;
      
      // Check for potential API keys or tokens
      if (/^[A-Za-z0-9]{32,}$/.test(stringValue) && stringValue.length > 20) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'SECURITY_HARDCODED_SECRET',
          message: 'Potential hardcoded secret or API key detected',
          suggestion: 'Use environment variables or secure configuration for secrets',
        });
      }
      
      // Check for common secret patterns
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/i,
        /secret\s*[:=]\s*['"][^'"]{16,}['"]/i,
        /token\s*[:=]\s*['"][^'"]{16,}['"]/i,
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(nodeText)) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'SECURITY_HARDCODED_CREDENTIALS',
            message: 'Hardcoded credentials detected',
            suggestion: 'Use environment variables or secure configuration',
          });
          break;
        }
      }
    }
    
    // Check for SQL injection vulnerabilities (string concatenation in queries)
    if (ts.isBinaryExpression(node) && 
        node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const leftText = getNodeText(sourceFile, node.left);
      const rightText = getNodeText(sourceFile, node.right);
      
      if ((leftText.includes('SELECT') || leftText.includes('INSERT') || 
           leftText.includes('UPDATE') || leftText.includes('DELETE')) &&
          (rightText.includes('input') || rightText.includes('param') || rightText.includes('user'))) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          type: 'SECURITY_SQL_INJECTION',
          message: 'Potential SQL injection - avoid string concatenation in queries',
          suggestion: 'Use parameterized queries or prepared statements',
        });
      }
    }
    
    // Check for path traversal vulnerabilities
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'join' &&
        node.arguments.length > 1) {
      
      const hasUserInput = node.arguments.some(arg => {
        const argText = getNodeText(sourceFile, arg);
        return argText.includes('input') || argText.includes('param') || 
               argText.includes('query') || argText.includes('req.');
      });
      
      if (hasUserInput) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'SECURITY_PATH_TRAVERSAL',
          message: 'Potential path traversal - validate user input in path operations',
          suggestion: 'Sanitize and validate file paths from user input',
        });
      }
    }
  });
}

/**
 * Validate performance patterns
 */
function validatePerformance(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    const nodeText = getNodeText(sourceFile, node);
    
    // Check for synchronous blocking operations
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text.endsWith('Sync')) {
      const methodName = node.expression.name.text;
      const blockingMethods = ['readFileSync', 'writeFileSync', 'mkdirSync', 'rmSync', 'statSync'];
      
      if (blockingMethods.includes(methodName) && !filePath.includes('.test.')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_SYNC_OPERATION',
          message: `Synchronous ${methodName} can block event loop`,
          suggestion: `Use async version: ${methodName.replace('Sync', '')}`,
        });
      }
    }
    
    // Check for inefficient loops
    if (ts.isForInStatement(node)) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'PERFORMANCE_FOR_IN_LOOP',
        message: 'for...in loop can be slow for arrays',
        suggestion: 'Use for...of, forEach, or traditional for loop for arrays',
      });
    }
    
    // Check for nested loops
    if (ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isWhileStatement(node)) {
      let hasNestedLoop = false;
      
      visitNode(node, sourceFile, (childNode) => {
        if (childNode !== node && 
            (ts.isForStatement(childNode) || ts.isForOfStatement(childNode) || 
             ts.isWhileStatement(childNode))) {
          hasNestedLoop = true;
        }
      });
      
      if (hasNestedLoop) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_NESTED_LOOPS',
          message: 'Nested loops can cause performance issues',
          suggestion: 'Consider algorithm optimization or using Map/Set for lookups',
        });
      }
    }
    
    // Check for excessive object property access in loops
    if ((ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isWhileStatement(node)) &&
        node.statement && ts.isBlock(node.statement)) {
      
      let hasRepeatedPropertyAccess = false;
      const propertyAccesses = new Map();
      
      visitNode(node.statement, sourceFile, (childNode) => {
        if (ts.isPropertyAccessExpression(childNode)) {
          const accessText = getNodeText(sourceFile, childNode);
          const count = propertyAccesses.get(accessText) || 0;
          propertyAccesses.set(accessText, count + 1);
          
          if (count > 2) {
            hasRepeatedPropertyAccess = true;
          }
        }
      });
      
      if (hasRepeatedPropertyAccess) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_REPEATED_PROPERTY_ACCESS',
          message: 'Repeated property access in loop',
          suggestion: 'Cache property values outside the loop',
        });
      }
    }
    
    // Check for inefficient array operations
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      
      // Check for inefficient search patterns
      if (methodName === 'find' && node.parent && ts.isPropertyAccessExpression(node.parent)) {
        const chainedMethod = node.parent.name.text;
        if (['length', 'indexOf'].includes(chainedMethod)) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'PERFORMANCE_INEFFICIENT_SEARCH',
            message: 'Inefficient search pattern detected',
            suggestion: 'Use includes(), some(), or Set for existence checks',
          });
        }
      }
      
      // Check for Array.push in loops
      if (methodName === 'push') {
        const parent = node.parent;
        while (parent) {
          if (ts.isForStatement(parent) || ts.isForOfStatement(parent) || ts.isWhileStatement(parent)) {
            WARNINGS.push({
              file: filePath,
              line: lineNum,
              type: 'PERFORMANCE_ARRAY_PUSH_LOOP',
              message: 'Array.push in loop can be inefficient for large datasets',
              suggestion: 'Consider pre-allocating array size or using different data structure',
            });
            break;
          }
          parent = parent.parent;
        }
      }
    }
    
    // Check for memory leaks - missing cleanup
    if (ts.isCallExpression(node) && 
        ts.isIdentifier(node.expression) &&
        ['setInterval', 'setTimeout'].includes(node.expression.text)) {
      
      // Look for corresponding clear calls in the same function or class
      let hasCleanup = false;
      const functionNode = node.parent;
      
      if (functionNode) {
        visitNode(functionNode, sourceFile, (childNode) => {
          if (ts.isCallExpression(childNode) && 
              ts.isIdentifier(childNode.expression) &&
              ['clearInterval', 'clearTimeout'].includes(childNode.expression.text)) {
            hasCleanup = true;
          }
        });
      }
      
      if (!hasCleanup) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_TIMER_LEAK',
          message: 'Timer without cleanup can cause memory leaks',
          suggestion: 'Store timer ID and clear it in cleanup/dispose method',
        });
      }
    }
    
    // Check for large object literals (potential memory issues)
    if (ts.isObjectLiteralExpression(node)) {
      const propertyCount = node.properties.length;
      if (propertyCount > 50) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_LARGE_OBJECT',
          message: `Large object literal with ${propertyCount} properties`,
          suggestion: 'Consider breaking into smaller objects or using Map for dynamic data',
        });
      }
    }
    
    // Check for recursive functions without memoization
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      const functionName = node.name.text;
      let hasRecursiveCall = false;
      let hasMemoization = false;
      
      if (node.body) {
        visitNode(node.body, sourceFile, (childNode) => {
          if (ts.isCallExpression(childNode) && 
              ts.isIdentifier(childNode.expression) &&
              childNode.expression.text === functionName) {
            hasRecursiveCall = true;
          }
          
          // Check for memoization patterns (cache, memo, etc.)
          const childText = getNodeText(sourceFile, childNode);
          if (childText.includes('cache') || childText.includes('memo') || 
              childText.includes('Map') || childText.includes('WeakMap')) {
            hasMemoization = true;
          }
        });
      }
      
      if (hasRecursiveCall && !hasMemoization && functionName !== 'visitNode') {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_RECURSIVE_NO_MEMO',
          message: `Recursive function "${functionName}" without memoization`,
          suggestion: 'Consider adding memoization for better performance',
        });
      }
    }
  });
}

/**
 * Validate resource management patterns
 */
function validateResourceManagement(filePath, sourceFile) {
  let hasResourceCreation = false;
  let hasResourceCleanup = false;
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    const nodeText = getNodeText(sourceFile, node);
    
    // Check for resource creation patterns
    if (ts.isNewExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
      const className = node.expression.text;
      const resourceClasses = ['EventEmitter', 'Server', 'Database', 'Connection', 'Stream'];
      
      if (resourceClasses.some(rc => className.includes(rc))) {
        hasResourceCreation = true;
      }
    }
    
    // Check for file handle creation
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        ['createReadStream', 'createWriteStream', 'open'].includes(node.expression.name.text)) {
      hasResourceCreation = true;
    }
    
    // Check for cleanup methods
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      const cleanupMethods = ['close', 'end', 'destroy', 'dispose', 'cleanup', 'disconnect'];
      
      if (cleanupMethods.includes(methodName)) {
        hasResourceCleanup = true;
      }
    }
    
    // Check for event listener cleanup
    if (ts.isCallExpression(node) && 
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'addEventListener') {
      
      // Look for corresponding removeEventListener
      let hasRemoveListener = false;
      const parentFunction = node.parent;
      
      if (parentFunction) {
        visitNode(parentFunction, sourceFile, (childNode) => {
          if (ts.isCallExpression(childNode) && 
              ts.isPropertyAccessExpression(childNode.expression) &&
              childNode.expression.name.text === 'removeEventListener') {
            hasRemoveListener = true;
          }
        });
      }
      
      if (!hasRemoveListener) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'PERFORMANCE_EVENT_LISTENER_LEAK',
          message: 'Event listener without removal can cause memory leaks',
          suggestion: 'Add removeEventListener in cleanup/dispose method',
        });
      }
    }
  });
  
  // File-level validation for resource management
  if (hasResourceCreation && !hasResourceCleanup) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'PERFORMANCE_RESOURCE_NO_CLEANUP',
      message: 'File creates resources but has no cleanup patterns',
      suggestion: 'Implement dispose/cleanup methods for proper resource management',
    });
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

    // Run all validations
    validateSecurity(filePath, sourceFile);
    validatePerformance(filePath, sourceFile);
    validateResourceManagement(filePath, sourceFile);
  });
}

/**
 * Find TypeScript files in all packages
 */
function findSecurityPerformanceFiles() {
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
 * Main validation function
 */
function validateSecurityAndPerformance() {
  console.log('🔍 Validating security and performance patterns (AST-based)...');

  const files = findSecurityPerformanceFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze`);

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} security and performance errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} security and performance warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ No security or performance issues detected!');
  } else if (!hasErrors) {
    console.log('✅ No critical security or performance errors found!');
    console.log('💡 Consider addressing warnings to improve security and performance.');
  }

  // Only exit with error code for actual errors, not warnings
  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateSecurityAndPerformance();
}

module.exports = { validateSecurityAndPerformance };