#!/usr/bin/env node

/**
 * Architecture Patterns Validation (AST-based)
 * Uses TypeScript compiler API to enforce architectural patterns across packages
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
 * Check if class is a manager class
 */
function isManagerClass(className) {
  return className.endsWith('Manager') || className.includes('Manager');
}

/**
 * Check if class is a service class
 */
function isServiceClass(className) {
  return className.endsWith('Service') || className.includes('Service');
}

/**
 * Check if class is a provider class
 */
function isProviderClass(className) {
  return className.endsWith('Provider') || className.includes('Provider');
}

/**
 * Get package name from file path
 */
function getPackageName(filePath) {
  const match = filePath.match(/packages\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Validate manager class patterns
 */
function validateManagerPatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check class declarations for manager patterns
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      if (isManagerClass(className)) {
        let hasInitializeMethod = false;
        let hasDisposeMethod = false;
        let hasConstructorDI = false;
        let isExported = false;
        
        // Check if class is exported
        isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
        
        // Check constructor for dependency injection
        const constructor = node.members.find(member => ts.isConstructorDeclaration(member));
        if (constructor && constructor.parameters && constructor.parameters.length > 0) {
          hasConstructorDI = true;
        }
        
        // Check for required methods
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            if (methodName === 'initialize') {
              hasInitializeMethod = true;
              
              // Check if initialize is async
              const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
              if (!isAsync) {
                WARNINGS.push({
                  file: filePath,
                  line: getLineNumber(sourceFile, member),
                  type: 'MANAGER_SYNC_INITIALIZE',
                  message: `Manager class "${className}" initialize() method should be async`,
                  suggestion: 'Make initialize() method async for proper resource initialization',
                });
              }
            }
            
            if (methodName === 'dispose') {
              hasDisposeMethod = true;
              
              // Check if dispose is async
              const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
              if (!isAsync) {
                WARNINGS.push({
                  file: filePath,
                  line: getLineNumber(sourceFile, member),
                  type: 'MANAGER_SYNC_DISPOSE',
                  message: `Manager class "${className}" dispose() method should be async`,
                  suggestion: 'Make dispose() method async for proper resource cleanup',
                });
              }
            }
          }
        });
        
        // Report missing patterns
        if (!hasInitializeMethod) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'MANAGER_MISSING_INITIALIZE',
            message: `Manager class "${className}" missing initialize() method`,
            suggestion: 'Add async initialize() method for proper setup',
          });
        }
        
        if (!hasDisposeMethod) {
          ERRORS.push({
            file: filePath,
            line: lineNum,
            type: 'MANAGER_MISSING_DISPOSE',
            message: `Manager class "${className}" missing dispose() method`,
            suggestion: 'Add async dispose() method for proper cleanup',
          });
        }
        
        if (!hasConstructorDI) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'MANAGER_NO_DI',
            message: `Manager class "${className}" should use dependency injection`,
            suggestion: 'Add constructor parameters for dependencies (storage, config, logger)',
          });
        }
        
        if (!isExported) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'MANAGER_NOT_EXPORTED',
            message: `Manager class "${className}" should be exported`,
            suggestion: 'Export manager classes for use by other packages',
          });
        }
      }
    }
  });
}

/**
 * Validate interface and implementation separation
 */
function validateInterfacePatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check for interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      
      // Check if interface follows naming conventions
      if ((isManagerClass(interfaceName) || isServiceClass(interfaceName) || isProviderClass(interfaceName)) 
          && !interfaceName.startsWith('I')) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'INTERFACE_NAMING',
          message: `Interface "${interfaceName}" should be prefixed with 'I'`,
          suggestion: `Rename to "I${interfaceName}" for clear interface identification`,
        });
      }
    }
    
    // Check class implementations for interface compliance
    if (ts.isClassDeclaration(node) && node.name && node.heritageClauses) {
      const className = node.name.text;
      
      node.heritageClauses.forEach(clause => {
        if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          const interfaceCount = clause.types.length;
          if (interfaceCount > 3) {
            WARNINGS.push({
              file: filePath,
              line: lineNum,
              type: 'TOO_MANY_INTERFACES',
              message: `Class "${className}" implements many interfaces (${interfaceCount})`,
              suggestion: 'Consider composition over multiple interface implementation',
            });
          }
        }
      });
    }
  });
}

/**
 * Validate service layer patterns
 */
function validateServicePatterns(filePath, sourceFile) {
  const packageName = getPackageName(filePath);
  
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check class declarations for service patterns
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      if (isServiceClass(className)) {
        let hasStatefulProperties = false;
        let hasBusinessLogic = false;
        
        // Check class members
        node.members.forEach(member => {
          // Check for stateful properties (beyond constructor dependencies)
          if (ts.isPropertyDeclaration(member) && 
              !member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword)) {
            hasStatefulProperties = true;
          }
          
          // Check for business logic methods
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            if (!['constructor', 'initialize', 'dispose'].includes(methodName)) {
              hasBusinessLogic = true;
            }
          }
        });
        
        if (hasStatefulProperties) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'SERVICE_STATEFUL',
            message: `Service class "${className}" has mutable state`,
            suggestion: 'Services should be stateless - move state to managers or storage',
          });
        }
        
        if (!hasBusinessLogic) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'SERVICE_NO_LOGIC',
            message: `Service class "${className}" appears to have no business logic`,
            suggestion: 'Ensure services contain meaningful business logic',
          });
        }
      }
    }
  });
}

/**
 * Validate storage provider patterns
 */
function validateStoragePatterns(filePath, sourceFile) {
  visitNode(sourceFile, sourceFile, (node, sourceFile) => {
    const lineNum = getLineNumber(sourceFile, node);
    
    // Check class declarations for storage patterns
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      if (isProviderClass(className)) {
        let hasAsyncMethods = false;
        let hasErrorHandling = false;
        let extendsBase = false;
        
        // Check if extends base class
        if (node.heritageClauses) {
          node.heritageClauses.forEach(clause => {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              clause.types.forEach(type => {
                if (ts.isIdentifier(type.expression) && 
                    type.expression.text.includes('Base')) {
                  extendsBase = true;
                }
              });
            }
          });
        }
        
        // Check methods
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
            
            // Check for async CRUD operations
            if (['save', 'load', 'delete', 'create', 'update', 'get', 'list'].includes(methodName)) {
              if (isAsync) {
                hasAsyncMethods = true;
              } else {
                WARNINGS.push({
                  file: filePath,
                  line: getLineNumber(sourceFile, member),
                  type: 'STORAGE_SYNC_METHOD',
                  message: `Storage provider "${className}" method "${methodName}" should be async`,
                  suggestion: 'Storage operations should be asynchronous for better performance',
                });
              }
            }
            
            // Check for error handling in async methods
            if (isAsync && member.body && ts.isBlock(member.body)) {
              const hasTryCatch = member.body.statements.some(stmt => ts.isTryStatement(stmt));
              if (hasTryCatch) {
                hasErrorHandling = true;
              }
            }
          }
        });
        
        if (!extendsBase && className !== 'BaseStorageProvider') {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'STORAGE_NO_BASE',
            message: `Storage provider "${className}" should extend BaseStorageProvider`,
            suggestion: 'Extend BaseStorageProvider for consistent interface',
          });
        }
        
        if (hasAsyncMethods && !hasErrorHandling) {
          WARNINGS.push({
            file: filePath,
            line: lineNum,
            type: 'STORAGE_NO_ERROR_HANDLING',
            message: `Storage provider "${className}" missing error handling in async methods`,
            suggestion: 'Add try-catch blocks to handle storage operation failures',
          });
        }
      }
    }
  });
}

/**
 * Validate package-specific patterns
 */
function validatePackageSpecificPatterns(filePath, sourceFile) {
  const packageName = getPackageName(filePath);
  const lineNum = 1; // Package-level validations
  
  // MCP package specific validations
  if (packageName === 'mcp') {
    let hasMCPToolPattern = false;
    let hasErrorHandling = false;
    
    visitNode(sourceFile, sourceFile, (node, sourceFile) => {
      // Check for MCP tool patterns
      if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const variableName = node.name.text;
        if (variableName.includes('tool') || variableName.includes('Tool')) {
          hasMCPToolPattern = true;
        }
      }
      
      // Check for proper error handling with McpError
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        if (importPath.includes('@modelcontextprotocol') && 
            node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach(element => {
            if (element.name.text === 'McpError') {
              hasErrorHandling = true;
            }
          });
        }
      }
    });
    
    if (filePath.includes('/tools/') && !hasMCPToolPattern) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'MCP_TOOL_PATTERN',
        message: 'MCP tool file should follow tool definition patterns',
        suggestion: 'Define tool objects with name, description, and inputSchema',
      });
    }
  }
  
  // Web package specific validations
  if (packageName === 'web') {
    let hasReactPatterns = false;
    let hasNextJSPatterns = false;
    
    visitNode(sourceFile, sourceFile, (node, sourceFile) => {
      // Check for React import patterns
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        if (importPath === 'react' || importPath.startsWith('next/')) {
          if (importPath === 'react') hasReactPatterns = true;
          if (importPath.startsWith('next/')) hasNextJSPatterns = true;
        }
      }
    });
    
    if (filePath.includes('/components/') && !hasReactPatterns) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'WEB_COMPONENT_PATTERN',
        message: 'Web component should import React',
        suggestion: 'Components should import React for proper JSX handling',
      });
    }
    
    if (filePath.includes('/app/') && filePath.endsWith('route.ts') && !hasNextJSPatterns) {
      WARNINGS.push({
        file: filePath,
        line: lineNum,
        type: 'WEB_ROUTE_PATTERN',
        message: 'Next.js route should follow App Router patterns',
        suggestion: 'Use Next.js imports and patterns for route handlers',
      });
    }
  }
  
  // Core package specific validations
  if (packageName === 'core') {
    let hasManagerExports = false;
    let hasTypeExports = false;
    
    if (filePath.endsWith('/index.ts')) {
      visitNode(sourceFile, sourceFile, (node, sourceFile) => {
        if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const exportPath = node.moduleSpecifier.text;
          if (exportPath.includes('manager')) hasManagerExports = true;
          if (exportPath.includes('types')) hasTypeExports = true;
        }
      });
      
      if (!hasManagerExports) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'CORE_MISSING_MANAGER_EXPORTS',
          message: 'Core package index should export manager classes',
          suggestion: 'Export manager classes for use by other packages',
        });
      }
      
      if (!hasTypeExports) {
        WARNINGS.push({
          file: filePath,
          line: lineNum,
          type: 'CORE_MISSING_TYPE_EXPORTS',
          message: 'Core package index should export type definitions',
          suggestion: 'Export types for use by other packages',
        });
      }
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

    // Run all validations
    validateManagerPatterns(filePath, sourceFile);
    validateInterfacePatterns(filePath, sourceFile);
    validateServicePatterns(filePath, sourceFile);
    validateStoragePatterns(filePath, sourceFile);
    validatePackageSpecificPatterns(filePath, sourceFile);
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
 * Main validation function
 */
function validateArchitecturePatterns() {
  console.log('🔍 Validating architecture patterns (AST-based)...');

  const files = findArchitectureFiles();
  console.log(`  Found ${files.length} TypeScript files to analyze`);

  validateFilesWithAST(files);

  // Report results
  let hasErrors = false;

  if (ERRORS.length > 0) {
    console.log(`\n❌ Found ${ERRORS.length} architecture pattern errors:\n`);
    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}:${error.line} [${error.type}]`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });
    hasErrors = true;
  }

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} architecture pattern warnings:\n`);
    WARNINGS.forEach((warning) => {
      console.log(`📁 ${warning.file}:${warning.line} [${warning.type}]`);
      console.log(`   ${warning.message}`);
      console.log(`   💡 ${warning.suggestion}\n`);
    });
  }

  if (!hasErrors && WARNINGS.length === 0) {
    console.log('✅ All architecture patterns are correct!');
  } else if (!hasErrors) {
    console.log('✅ No critical architecture pattern errors found!');
    console.log('💡 Consider addressing warnings to improve architecture consistency.');
  }

  // Only exit with error code for actual errors, not warnings
  process.exit(hasErrors ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  validateArchitecturePatterns();
}

module.exports = { validateArchitecturePatterns };