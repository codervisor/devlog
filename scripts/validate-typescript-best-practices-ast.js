#!/usr/bin/env node

/**
 * TypeScript Best Practices Validation (AST-based)
 * Uses TypeScript compiler API to enforce TypeScript coding standards
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
    strict: true,
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
 * Check if a type reference uses 'any'
 */
function isAnyType(typeNode) {
  return typeNode && typeNode.kind === ts.SyntaxKind.AnyKeyword;
}

/**
 * Check if node is a type reference (safe version)
 */
function isTypeReferenceSafe(node) {
  return ts.isTypeReferenceNode && ts.isTypeReferenceNode(node);
}

/**
 * Check if node has JSDoc comments
 */
function hasJSDoc(node) {
  return ts.getJSDocCommentsAndTags(node).length > 0;
}

/**
 * Validate TypeScript type usage
 */
function validateTypeUsage(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check for 'any' type usage - use safer checking
    if (isTypeReferenceSafe(node) && isAnyType(node)) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'ANY_TYPE_USAGE',
        message: 'Usage of "any" type detected',
        suggestion: 'Use specific types or "unknown" for better type safety',
      });
    }

    // Check for explicit any in type annotations
    if (ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) {
      if (node.type && isAnyType(node.type)) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'EXPLICIT_ANY_TYPE',
          message: 'Explicit "any" type annotation',
          suggestion: 'Define specific interface or use "unknown" with type guards',
        });
      }
    }

    // Check for non-null assertion operator overuse
    if (ts.isNonNullExpression(node)) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'NON_NULL_ASSERTION',
        message: 'Non-null assertion operator (!) usage detected',
        suggestion: 'Consider proper null checks or optional chaining instead',
      });
    }

    // Check for type assertions (as Type)
    if (ts.isTypeAssertion(node) || ts.isAsExpression(node)) {
      const nodeText = getNodeText(sourceFile, node);
      if (!nodeText.includes('unknown') && !nodeText.includes('HTMLElement') && !nodeText.includes('Element')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'TYPE_ASSERTION',
          message: 'Type assertion detected - may indicate type safety issues',
          suggestion: 'Ensure type assertion is necessary and safe, consider type guards',
        });
      }
    }
  });
}

/**
 * Validate async/await patterns
 */
function validateAsyncPatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check for missing await on Promise-returning calls
    if (ts.isCallExpression(node)) {
      const callText = getNodeText(sourceFile, node);
      
      // Check for common async methods without await
      if (node.expression && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        const asyncMethods = ['initialize', 'dispose', 'save', 'load', 'fetch', 'create', 'update', 'delete'];
        
        if (asyncMethods.includes(methodName)) {
          // Check if this call is awaited or used in Promise chain
          const parent = node.parent;
          const isAwaited = parent && ts.isAwaitExpression(parent);
          const isInThen = callText.includes('.then(') || callText.includes('.catch(');
          const isReturned = parent && ts.isReturnStatement(parent);
          
          if (!isAwaited && !isInThen && !isReturned) {
            WARNINGS.push({
              file: filePath,
              line: lineNum,
              type: 'MISSING_AWAIT',
              message: `Potential missing await on async method: ${methodName}()`,
              suggestion: 'Add await keyword or handle Promise with .then()/.catch()',
            });
          }
        }
      }
    }

    // Check for async functions without try-catch
    if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
      
      if (isAsync && node.body && ts.isBlock(node.body)) {
        const hasTryCatch = node.body.statements.some(stmt => ts.isTryStatement(stmt));
        const nodeText = getNodeText(sourceFile, node);
        
        // Skip if function is small or has withErrorHandling wrapper
        if (node.body.statements.length > 1 && !hasTryCatch && !nodeText.includes('withErrorHandling')) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'ASYNC_NO_ERROR_HANDLING',
            message: 'Async function without error handling',
            suggestion: 'Add try-catch block or use error handling wrapper',
          });
        }
      }
    }

    // Check for Promise constructor usage (often indicates need for async/await)
    if (ts.isNewExpression(node) && 
        node.expression && ts.isIdentifier(node.expression) && 
        node.expression.text === 'Promise') {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'PROMISE_CONSTRUCTOR',
        message: 'Promise constructor usage - consider async/await pattern',
        suggestion: 'Use async/await for cleaner asynchronous code',
      });
    }
  });
}

/**
 * Validate error handling patterns
 */
function validateErrorHandling(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check catch clauses for proper error typing
    if (ts.isCatchClause(node)) {
      const catchText = getNodeText(sourceFile, node);
      
      // Check if error is properly typed
      if (node.variableDeclaration) {
        const errorParam = node.variableDeclaration;
        if (!errorParam.type) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'UNTYPED_CATCH_ERROR',
            message: 'Catch block parameter should be typed',
            suggestion: 'Use (error: Error) or (error: unknown) for better type safety',
          });
        }
      }

      // Check for generic error handling
      if (catchText.includes('console.log') && !catchText.includes('logger')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'CONSOLE_LOG_IN_CATCH',
          message: 'Console.log in catch block - use proper logger',
          suggestion: 'Use structured logging with logger instead of console.log',
        });
      }

      // Check for empty catch blocks
      if (node.block.statements.length === 0) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          type: 'EMPTY_CATCH_BLOCK',
          message: 'Empty catch block - errors should be handled',
          suggestion: 'Add error logging, re-throwing, or proper error handling',
        });
      }
    }

    // Check for throw statements with proper error types
    if (ts.isThrowStatement(node) && node.expression) {
      if (ts.isStringLiteral(node.expression)) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'THROW_STRING',
          message: 'Throwing string instead of Error object',
          suggestion: 'Throw Error objects for better stack traces and error handling',
        });
      }
    }
  });
}

/**
 * Validate JSDoc documentation for public APIs
 */
function validateDocumentation(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check exported functions for JSDoc
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && 
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      
      if (!hasJSDoc(node)) {
        const functionName = node.name ? node.name.text : 'anonymous';
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'MISSING_JSDOC',
          message: `Exported function "${functionName}" missing JSDoc documentation`,
          suggestion: 'Add JSDoc comments for public API documentation',
        });
      }
    }

    // Check exported classes for JSDoc
    if (ts.isClassDeclaration(node) && 
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      
      if (!hasJSDoc(node)) {
        const className = node.name ? node.name.text : 'anonymous';
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'MISSING_CLASS_JSDOC',
          message: `Exported class "${className}" missing JSDoc documentation`,
          suggestion: 'Add JSDoc comments for class documentation',
        });
      }
    }

    // Check interface declarations for JSDoc
    if (ts.isInterfaceDeclaration(node) && 
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      
      if (!hasJSDoc(node)) {
        const interfaceName = node.name.text;
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'MISSING_INTERFACE_JSDOC',
          message: `Exported interface "${interfaceName}" missing JSDoc documentation`,
          suggestion: 'Add JSDoc comments for interface documentation',
        });
      }
    }
  });
}

/**
 * Validate generic type constraints and usage
 */
function validateGenerics(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check type parameters for proper constraints
    if (ts.isTypeParameterDeclaration && ts.isTypeParameterDeclaration(node)) {
      if (!node.constraint && node.name.text === 'T') {
        const parentNode = node.parent;
        if (ts.isFunctionDeclaration(parentNode) || ts.isMethodDeclaration(parentNode)) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'UNCONSTRAINED_GENERIC',
            message: 'Generic type T without constraints - consider adding constraints',
            suggestion: 'Add constraints like <T extends Record<string, any>> for better type safety',
          });
        }
      }
    }

    // Check for overly complex union types
    if (ts.isUnionTypeNode(node)) {
      if (node.types.length > 5) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'COMPLEX_UNION_TYPE',
          message: 'Union type with many members - consider using discriminated unions',
          suggestion: 'Use discriminated unions or enums for better maintainability',
        });
      }
    }
  });
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
    validateTypeUsage(filePath, sourceFile);
    validateAsyncPatterns(filePath, sourceFile);
    validateErrorHandling(filePath, sourceFile);
    validateDocumentation(filePath, sourceFile);
    validateGenerics(filePath, sourceFile);
  });
}

/**
 * Find TypeScript files in all packages
 */
function findTypeScriptFiles() {
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
function validateTypeScriptBestPractices() {
  console.log('🔍 Validating TypeScript best practices (AST-based)...');

  const files = findTypeScriptFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze`);

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} TypeScript best practice errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} TypeScript best practice warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All TypeScript best practices are followed!');
  } else if (!hasErrors) {
    console.log('✅ No critical TypeScript best practice errors found!');
    console.log('💡 Consider addressing warnings to improve code quality.');
  }

  // Only exit with error code for actual errors, not warnings
  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateTypeScriptBestPractices();
}

module.exports = { validateTypeScriptBestPractices };