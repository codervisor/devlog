#!/usr/bin/env node

/**
 * API Response Standardization Validation (AST-based)
 * Uses TypeScript compiler API for accurate code analysis
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ERRORS = [];
const WARNINGS = [];

// Standard error codes
const STANDARD_ERROR_CODES = [
  'PROJECT_NOT_FOUND',
  'DEVLOG_NOT_FOUND', 
  'NOTE_NOT_FOUND',
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED'
];

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
 * Check if node is an API route file (has route.ts in path)
 */
function isApiRoute(filePath) {
  return filePath.includes('/api/') && filePath.endsWith('route.ts');
}

/**
 * Check if node is a frontend file
 */
function isFrontendFile(filePath) {
  return (filePath.includes('/contexts/') || 
          filePath.includes('/hooks/') || 
          filePath.includes('/lib/') ||
          filePath.includes('/components/')) && 
         !filePath.includes('/api/');
}

/**
 * Validate API endpoint using AST
 */
function validateAPIEndpointAST(filePath, sourceFile) {
  let hasApiResponseUtil = false;
  let hasWithErrorHandling = false;
  let hasManualResponseJson = false;
  let imports = new Set();

  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check imports
    if (ts.isImportDeclaration(node)) {
      const importPath = node.moduleSpecifier?.text;
      if (importPath) {
        imports.add(importPath);
        
        // Check for api-utils imports
        if (importPath.includes('api-utils')) {
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              const importName = element.name.text;
              if (['apiResponse', 'apiError', 'apiCollection', 'withErrorHandling'].includes(importName)) {
                hasApiResponseUtil = true;
              }
              if (importName === 'withErrorHandling') {
                hasWithErrorHandling = true;
              }
            });
          }
        }
      }
    }

    // Check function calls
    if (ts.isCallExpression(node)) {
      const callText = getNodeText(sourceFile, node);
      
      // Check for standardized response utilities
      if (node.expression && ts.isIdentifier(node.expression)) {
        const functionName = node.expression.text;
        if (['apiResponse', 'apiError', 'apiCollection'].includes(functionName)) {
          hasApiResponseUtil = true;
        }
        if (functionName === 'withErrorHandling') {
          hasWithErrorHandling = true;
        }
      }
      
      // Check for manual Response.json calls
      if (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression && ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'Response' &&
          node.expression.name.text === 'json') {
        
        // Check if it's not using standardized format
        const parentText = getNodeText(sourceFile, node.parent);
        if (!parentText.includes('.success')) {
          hasManualResponseJson = true;
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'API_RESPONSE_FORMAT',
            message: 'Manual Response.json() without standardized envelope format',
            suggestion: 'Use apiResponse(), apiError(), or apiCollection() from api-utils.ts',
          });
        }
      }

      // Check for apiError calls with proper error codes
      if (node.expression && ts.isIdentifier(node.expression) && 
          node.expression.text === 'apiError' && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          const errorCode = firstArg.text;
          if (!STANDARD_ERROR_CODES.includes(errorCode)) {
            WARNINGS.push({
              file: filePath,
              line: lineNum,
              type: 'NON_STANDARD_ERROR_CODE',
              message: `Non-standard error code: ${errorCode}`,
              suggestion: `Use standard error codes: ${STANDARD_ERROR_CODES.join(', ')}`,
            });
          }
        } else {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'API_ERROR_CODE',
            message: 'apiError() call missing string literal error code',
            suggestion: 'Use standardized error codes: PROJECT_NOT_FOUND, VALIDATION_FAILED, etc.',
          });
        }
      }
    }

    // Check for export assignments (Next.js route handlers)
    if (ts.isExportAssignment(node) || 
        (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))) {
      
      // Look for route handler exports (GET, POST, etc.)
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name) && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(decl.name.text)) {
            // Check if it uses withErrorHandling
            if (decl.initializer && !getNodeText(sourceFile, decl.initializer).includes('withErrorHandling')) {
              WARNINGS.push({
                file: filePath,
                line: getLineNumber(sourceFile, decl),
                type: 'API_ERROR_HANDLING',
                message: `${decl.name.text} handler should use withErrorHandling() wrapper`,
                suggestion: 'Wrap your handler with withErrorHandling() for consistent error responses',
              });
            }
          }
        });
      }
    }
  });

  // File-level validations
  if (isApiRoute(filePath)) {
    if (!imports.has('./api-utils') && !imports.has('../api-utils') && !Array.from(imports).some(i => i.includes('api-utils'))) {
      WARNINGS.push({
        file: filePath,
        line: 1,
        type: 'API_UTILS_IMPORT',
        message: 'API endpoint should import standardized utilities',
        suggestion: 'Import { apiResponse, apiError, apiCollection, withErrorHandling } from api-utils',
      });
    }
  }
}

/**
 * Validate frontend API usage using AST
 */
function validateFrontendAPIUsageAST(filePath, sourceFile) {
  let hasApiClientImport = false;
  let hasManualFetch = false;
  let imports = new Set();

  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check imports
    if (ts.isImportDeclaration(node)) {
      const importPath = node.moduleSpecifier?.text;
      if (importPath) {
        imports.add(importPath);
        
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach(element => {
            const importName = element.name.text;
            if (importName === 'ApiClient' || importName === 'apiClient') {
              hasApiClientImport = true;
            }
          });
        }
      }
    }

    // Check function calls
    if (ts.isCallExpression(node)) {
      // Check for manual fetch calls
      if (node.expression && ts.isIdentifier(node.expression) && 
          node.expression.text === 'fetch') {
        hasManualFetch = true;
        
        // Skip warning for ApiClient implementation itself
        if (!filePath.includes('/lib/api-client.ts')) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'FRONTEND_MANUAL_FETCH',
            message: 'Manual fetch() call detected - consider using ApiClient',
            suggestion: 'Use ApiClient for consistent response handling and error management',
          });
        }
      }

      // Check for response.json() calls in frontend
      if (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'json' &&
          hasManualFetch && !filePath.includes('/lib/api-client.ts')) {
        ERRORS.push({
          file: filePath,
          line: lineNum,
          type: 'FRONTEND_MANUAL_PARSING',
          message: 'Manual response parsing - should use ApiClient',
          suggestion: 'ApiClient automatically handles response envelope parsing',
        });
      }
    }

    // Check catch clauses for proper error handling
    if (ts.isCatchClause(node) && hasApiClientImport) {
      const catchText = getNodeText(sourceFile, node);
      if (!catchText.includes('ApiError') && 
          !catchText.includes('.isNotFound') && 
          !catchText.includes('.isValidation') &&
          !catchText.includes('.code')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'FRONTEND_ERROR_HANDLING',
          message: 'Error handling should check for ApiError type',
          suggestion: 'Use error.isNotFound(), error.isValidation(), etc. for proper error handling',
        });
      }
    }

    // Check property access for envelope handling
    if (ts.isPropertyAccessExpression(node)) {
      const propertyName = node.name.text;
      const objectText = getNodeText(sourceFile, node.expression);
      
      // Check for direct response property access (not .data, .success, .error)
      if (objectText.includes('response') && 
          !['data', 'success', 'error', 'meta', 'status', 'headers', 'ok'].includes(propertyName) &&
          isFrontendFile(filePath)) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'FRONTEND_ENVELOPE_ACCESS',
          message: 'Direct response property access - should use envelope format',
          suggestion: 'Access data through response.data, check response.success, handle response.error',
        });
      }
    }
  });

  // Check for legacy API client usage
  if (Array.from(imports).some(i => i.includes('note-api-client')) && !hasApiClientImport) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'FRONTEND_LEGACY_CLIENT',
      message: 'Using legacy API client - should migrate to centralized ApiClient',
      suggestion: 'Import ApiClient from lib/api-client and use standardized methods',
    });
  }
}

/**
 * Validate type definitions using AST
 */
function validateTypeDefinitionsAST(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      
      // Check response interfaces
      if (interfaceName.includes('Response')) {
        const members = node.members;
        const memberNames = members.map(member => {
          if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
            return member.name.text;
          }
          return null;
        }).filter(Boolean);
        
        if (!memberNames.includes('success') || 
            !memberNames.includes('data') || 
            !memberNames.includes('meta')) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'TYPE_RESPONSE_FORMAT',
            message: 'Response interface should follow standardized envelope format',
            suggestion: 'Include success: boolean, data: T, meta: ResponseMeta properties',
          });
        }
      }
      
      // Check error interfaces
      if (interfaceName.includes('Error')) {
        const members = node.members;
        const memberNames = members.map(member => {
          if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
            return member.name.text;
          }
          return null;
        }).filter(Boolean);
        
        if (!memberNames.includes('code') || !memberNames.includes('message')) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'TYPE_ERROR_FORMAT',
            message: 'Error interface should include code and message properties',
            suggestion: 'Include code: string, message: string, details?: any properties',
          });
        }
      }
    }
  });
}

/**
 * Find and validate files using AST
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

    // Validate based on file type
    if (isApiRoute(filePath)) {
      validateAPIEndpointAST(filePath, sourceFile);
    }
    
    if (isFrontendFile(filePath)) {
      validateFrontendAPIUsageAST(filePath, sourceFile);
    }
    
    if (filePath.includes('/types/') || filePath.includes('/schemas/')) {
      validateTypeDefinitionsAST(filePath, sourceFile);
    }
  });
}

/**
 * Find relevant files for validation
 */
function findValidationFiles() {
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

  // Find TypeScript files in web package
  const webAppDir = path.join(process.cwd(), 'packages/web/app');
  if (fs.existsSync(webAppDir)) {
    findFilesRecursive(webAppDir, (file) => 
      (file.endsWith('.ts') || file.endsWith('.tsx')) && 
      !file.endsWith('.d.ts')
    );
  }

  return files;
}

/**
 * Main validation function
 */
function validateAPIStandardizationAST() {
  console.log('🔍 Validating API response standardization (AST-based)...');

  const files = findValidationFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze`);

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} API standardization errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} API standardization warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All API standardization patterns are valid!');
  } else if (!hasErrors) {
    console.log('✅ No critical API standardization errors found!');
    console.log('💡 Consider addressing warnings to improve code quality.');
  }

  // Only exit with error code for actual errors, not warnings
  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateAPIStandardizationAST();
}

module.exports = { validateAPIStandardizationAST };
