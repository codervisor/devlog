#!/usr/bin/env -S pnpm exec tsx

/**
 * Response Envelope Format Validation (AST-based)
 * Uses TypeScript compiler API for accurate envelope format analysis
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

interface ValidationIssue {
  file: string;
  line: number;
  type: string;
  message: string;
  suggestion: string;
}

const ERRORS: ValidationIssue[] = [];
const WARNINGS: ValidationIssue[] = [];

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
  'RATE_LIMITED',
] as const;

interface EnvelopeStructure {
  hasSuccess: boolean;
  hasData: boolean;
  hasMeta: boolean;
  hasError: boolean;
  propNames: string[];
}

/**
 * Create TypeScript program for AST analysis
 */
function createProgram(filePaths: string[]): ts.Program {
  const compilerOptions: ts.CompilerOptions = {
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
function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  visitor: (node: ts.Node, sourceFile: ts.SourceFile) => void,
): void {
  try {
    visitor(node, sourceFile);
    node.forEachChild((child) => visitNode(child, sourceFile, visitor));
  } catch (error) {
    // Skip problematic nodes and continue
    console.warn(
      `⚠️  Skipping problematic node in ${sourceFile.fileName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get line number from AST node with error handling
 */
function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
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
function getNodeText(sourceFile: ts.SourceFile, node: ts.Node): string {
  try {
    if (!sourceFile || !node) return '';
    return node.getText(sourceFile);
  } catch (error) {
    return ''; // Fallback to empty string
  }
}

/**
 * Check if object literal has envelope structure
 */
function hasEnvelopeStructure(objectLiteral: ts.ObjectLiteralExpression): EnvelopeStructure {
  const properties = objectLiteral.properties;
  const propNames = properties
    .map((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        return prop.name.text;
      }
      return null;
    })
    .filter(Boolean) as string[];

  const hasSuccess = propNames.includes('success');
  const hasData = propNames.includes('data');
  const hasMeta = propNames.includes('meta');
  const hasError = propNames.includes('error');

  return { hasSuccess, hasData, hasMeta, hasError, propNames };
}

/**
 * Check if success response has proper envelope format
 */
function validateSuccessEnvelope(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
): void {
  const lineNum = getLineNumber(sourceFile, node);
  const envelope = hasEnvelopeStructure(node);

  if (envelope.hasSuccess) {
    // Find success property value
    const successProp = node.properties.find(
      (prop) =>
        ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'success',
    ) as ts.PropertyAssignment | undefined;

    if (successProp && successProp.initializer) {
      const isSuccessTrue = successProp.initializer.kind === ts.SyntaxKind.TrueKeyword;

      if (isSuccessTrue) {
        // This is a success response, validate structure
        if (!envelope.hasData) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'SUCCESS_MISSING_DATA',
            message: 'Success response missing data field',
            suggestion: 'Include data property in success response envelope',
          });
        }

        if (!envelope.hasMeta) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'SUCCESS_MISSING_META',
            message: 'Success response missing meta field',
            suggestion:
              'Include meta: { timestamp: new Date().toISOString() } or use apiResponse()',
          });
        } else {
          // Check meta structure
          const metaProp = node.properties.find(
            (prop) =>
              ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              prop.name.text === 'meta',
          ) as ts.PropertyAssignment | undefined;

          if (metaProp && ts.isObjectLiteralExpression(metaProp.initializer)) {
            const metaProps = metaProp.initializer.properties
              .map((prop) => {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                  return prop.name.text;
                }
                return null;
              })
              .filter(Boolean) as string[];

            if (!metaProps.includes('timestamp')) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'META_MISSING_TIMESTAMP',
                message: 'Meta object missing timestamp field',
                suggestion: 'Include timestamp: new Date().toISOString() in meta',
              });
            }
          }
        }
      } else if (successProp.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        // This is an error response, validate structure
        if (!envelope.hasError) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'ERROR_MISSING_STRUCTURE',
            message: 'Error response missing error field',
            suggestion:
              'Include error: { code: "ERROR_CODE", message: "Description" } or use apiError()',
          });
        } else {
          // Check error structure
          const errorProp = node.properties.find(
            (prop) =>
              ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              prop.name.text === 'error',
          ) as ts.PropertyAssignment | undefined;

          if (errorProp && ts.isObjectLiteralExpression(errorProp.initializer)) {
            const errorProps = errorProp.initializer.properties
              .map((prop) => {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                  return prop.name.text;
                }
                return null;
              })
              .filter(Boolean) as string[];

            if (!errorProps.includes('code') || !errorProps.includes('message')) {
              ERRORS.push({
                file: filePath,
                line: lineNum,
                type: 'ERROR_MISSING_STRUCTURE',
                message: 'Error response missing required code/message fields',
                suggestion:
                  'Include error: { code: "ERROR_CODE", message: "Description" } or use apiError()',
              });
            }
          }
        }
      }
    }
  }
}

/**
 * Validate API route response envelope using AST
 */
function validateResponseEnvelopeAST(filePath: string, sourceFile: ts.SourceFile): void {
  let hasSuccessEnvelope = false;
  let hasErrorEnvelope = false;
  let usesResponseUtils = false;

  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);

    // Check for standardized response utilities usage
    if (ts.isCallExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text;
      if (['apiResponse', 'apiError', 'apiCollection'].includes(functionName)) {
        usesResponseUtils = true;

        // Check apiError calls for proper error codes
        if (functionName === 'apiError' && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (ts.isStringLiteral(firstArg)) {
            const errorCode = firstArg.text;
            if (!STANDARD_ERROR_CODES.includes(errorCode as any)) {
              WARNINGS.push({
                file: filePath,
                line: lineNum,
                type: 'NON_STANDARD_ERROR_CODE',
                message: `Non-standard error code: ${errorCode}`,
                suggestion: `Use standard error codes: ${STANDARD_ERROR_CODES.join(', ')}`,
              });
            }
          }
        }
      }
    }

    // Check for manual Response.json calls
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Response' &&
      node.expression.name.text === 'json'
    ) {
      // Check the argument to Response.json()
      if (node.arguments.length > 0) {
        const jsonArg = node.arguments[0];

        if (ts.isObjectLiteralExpression(jsonArg)) {
          const envelope = hasEnvelopeStructure(jsonArg);

          if (envelope.hasSuccess) {
            hasSuccessEnvelope = true;
            validateSuccessEnvelope(jsonArg, sourceFile, filePath);
          } else {
            // No envelope format detected
            ERRORS.push({
              file: filePath,
              line: lineNum,
              type: 'NON_ENVELOPE_RESPONSE',
              message: 'Response.json() without envelope format',
              suggestion: 'Use standardized envelope format or apiResponse/apiError utilities',
            });
          }
        }
      }
    }

    // Check for object literals that might be response envelopes
    if (ts.isObjectLiteralExpression(node)) {
      const envelope = hasEnvelopeStructure(node);

      if (envelope.hasSuccess) {
        const parentNode = node.parent;
        // Check if this is likely a response object (not just any object with success property)
        if (
          ts.isReturnStatement(parentNode) ||
          ts.isCallExpression(parentNode) ||
          ts.isPropertyAssignment(parentNode)
        ) {
          validateSuccessEnvelope(node, sourceFile, filePath);
        }
      }
    }

    // Check for status code assignments
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'status' &&
      node.arguments.length > 0
    ) {
      const statusArg = node.arguments[0];
      if (ts.isNumericLiteral(statusArg)) {
        const status = parseInt(statusArg.text);

        if (status >= 400 && !hasErrorEnvelope && !usesResponseUtils) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'STATUS_WITHOUT_ERROR_ENVELOPE',
            message: `Status ${status} should use error envelope format`,
            suggestion: 'Use apiError() utility or ensure error response follows envelope format',
          });
        }
      }
    }

    // Check for throw statements
    if (ts.isThrowStatement(node) && !hasErrorEnvelope) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'UNHANDLED_ERROR',
        message: 'Thrown error may not be properly caught and formatted',
        suggestion:
          'Use withErrorHandling() wrapper or ensure error is caught and formatted as envelope',
      });
    }
  });

  // File-level validations
  if (
    filePath.includes('/api/') &&
    !usesResponseUtils &&
    !hasSuccessEnvelope &&
    !hasErrorEnvelope
  ) {
    WARNINGS.push({
      file: filePath,
      line: 1,
      type: 'NO_ENVELOPE_FORMAT',
      message: 'API route appears to not use standardized envelope format',
      suggestion: 'Use apiResponse/apiError utilities or implement envelope format manually',
    });
  }
}

/**
 * Validate frontend envelope handling using AST
 */
function validateEnvelopeHandlingAST(filePath: string, sourceFile: ts.SourceFile): void {
  let hasApiClientUsage = false;

  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);

    // Check imports for ApiClient
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      node.importClause.namedBindings.elements.forEach((element) => {
        if (element.name.text === 'ApiClient' || element.name.text === 'apiClient') {
          hasApiClientUsage = true;
        }
      });
    }

    // Check property access for envelope handling
    if (ts.isPropertyAccessExpression(node)) {
      const propertyName = node.name.text;
      const objectText = getNodeText(sourceFile, node.expression);

      // Check for pagination access patterns
      if (propertyName === 'pagination' && !objectText.includes('.meta')) {
        if (hasApiClientUsage || objectText.includes('response')) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'PAGINATION_ACCESS',
            message: 'Pagination should be accessed from response.meta.pagination',
            suggestion: 'Use response.meta.pagination for standardized pagination info',
          });
        }
      }

      // Check for direct response property access
      if (
        objectText.includes('response') &&
        !['data', 'success', 'error', 'meta', 'status', 'headers', 'ok'].includes(propertyName)
      ) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'DIRECT_RESPONSE_ACCESS',
          message: 'Direct response property access - may not handle envelope format',
          suggestion:
            'Access data through response.data, check response.success, handle response.error',
        });
      }
    }

    // Check catch clauses for proper error handling
    if (ts.isCatchClause(node) && hasApiClientUsage) {
      const catchText = getNodeText(sourceFile, node);
      if (
        !catchText.includes('ApiError') &&
        !catchText.includes('.isNotFound') &&
        !catchText.includes('.isValidation') &&
        !catchText.includes('.code')
      ) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'INCOMPLETE_ERROR_HANDLING',
          message: 'Error handling may not properly handle ApiError types',
          suggestion:
            'Use ApiError methods like .isNotFound(), .isValidation(), or check .code property',
        });
      }
    }

    // Check for manual fetch without envelope handling
    if (
      ts.isCallExpression(node) &&
      node.expression &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fetch' &&
      !hasApiClientUsage &&
      !filePath.includes('/lib/api-client.ts')
    ) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'MANUAL_FETCH_NO_ENVELOPE',
        message: 'Manual fetch usage without envelope response handling',
        suggestion: 'Use ApiClient or ensure response envelope format is properly handled',
      });
    }
  });
}

/**
 * Find and validate files using AST
 */
function validateFilesWithAST(filePaths: string[]): void {
  console.log(`🔍 Creating TypeScript program for ${filePaths.length} files...`);

  const program = createProgram(filePaths);

  filePaths.forEach((filePath) => {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.warn(`⚠️  Could not parse ${filePath}`);
      return;
    }

    // Validate API routes for envelope format
    if (filePath.includes('/api/') && filePath.endsWith('route.ts')) {
      validateResponseEnvelopeAST(filePath, sourceFile);
    }

    // Validate frontend files for envelope handling
    if (
      (filePath.includes('/contexts/') ||
        filePath.includes('/hooks/') ||
        filePath.includes('/lib/') ||
        filePath.includes('/components/')) &&
      !filePath.includes('/api/')
    ) {
      validateEnvelopeHandlingAST(filePath, sourceFile);
    }
  });
}

/**
 * Find files to validate
 */
function findEnvelopeValidationFiles(): string[] {
  const files: string[] = [];

  function findFilesRecursive(dir: string, predicate: (file: string) => boolean): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (
          !['node_modules', 'build', 'dist', '.next', '.next-build', 'coverage'].includes(entry)
        ) {
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
    findFilesRecursive(
      webAppDir,
      (file) => (file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts'),
    );
  }

  return files;
}

/**
 * Main validation function
 */
export function validateResponseEnvelopesAST(): void {
  console.log('🔍 Validating response envelope format (AST-based)...');

  const files = findEnvelopeValidationFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze`);

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} envelope format errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} envelope format warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All response envelope formats are valid!');
  } else if (!hasErrors) {
    console.log('✅ No critical envelope format errors found!');
    console.log('💡 Consider addressing warnings to improve consistency.');
  }

  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateResponseEnvelopesAST();
}
