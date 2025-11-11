#!/usr/bin/env -S pnpm exec tsx

/**
 * File Naming Convention Validation
 * Validates that all files in the web directory follow kebab-case naming conventions
 */

import fs from 'fs';
import path from 'path';

interface ValidationError {
  file: string;
  message: string;
  suggestion: string;
}

const ERRORS: ValidationError[] = [];

/**
 * Check if a filename follows kebab-case convention
 */
function isKebabCase(filename: string): boolean {
  // Handle special file patterns (e.g., .test.ts, .spec.ts, .d.ts)
  // Extract the base name before any special suffixes
  let nameToValidate = filename;
  
  // Remove common file suffixes that should be preserved
  const specialSuffixes = ['.test', '.spec', '.d'];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf'];
  
  // Remove extension first (handle compound extensions like .woff2)
  let hasExtension = '';
  for (const ext of extensions.sort((a, b) => b.length - a.length)) { // Sort by length to match longer extensions first
    if (filename.endsWith(ext)) {
      hasExtension = ext;
      nameToValidate = filename.slice(0, -ext.length);
      break;
    }
  }
  
  // Remove special suffixes
  const hasSpecialSuffix = specialSuffixes.find(suffix => nameToValidate.endsWith(suffix));
  if (hasSpecialSuffix) {
    nameToValidate = nameToValidate.slice(0, -hasSpecialSuffix.length);
  }
  
  // Kebab-case pattern: lowercase letters, numbers, and hyphens only
  // Cannot start or end with hyphens, cannot have consecutive hyphens
  const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  
  return kebabCasePattern.test(nameToValidate);
}

/**
 * Convert a filename to suggested kebab-case format
 */
function toKebabCase(filename: string): string {
  // Handle special file patterns (e.g., .test.ts, .spec.ts, .d.ts)
  let nameToConvert = filename;
  let preservedSuffix = '';
  
  // Extract and preserve special suffixes and extensions
  const specialSuffixes = ['.test', '.spec', '.d'];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md'];
  
  // Remove and preserve extension
  const hasExtension = extensions.find(ext => filename.endsWith(ext));
  if (hasExtension) {
    preservedSuffix = hasExtension + preservedSuffix;
    nameToConvert = filename.slice(0, -hasExtension.length);
  }
  
  // Remove and preserve special suffixes
  const hasSpecialSuffix = specialSuffixes.find(suffix => nameToConvert.endsWith(suffix));
  if (hasSpecialSuffix) {
    preservedSuffix = hasSpecialSuffix + preservedSuffix;
    nameToConvert = nameToConvert.slice(0, -hasSpecialSuffix.length);
  }
  
  // Convert to kebab-case
  const kebabName = nameToConvert
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab-case
    .replace(/[_\s]+/g, '-') // Replace underscores and spaces with hyphens
    .replace(/[^a-zA-Z0-9-]/g, '') // Remove special characters except hyphens
    .toLowerCase()
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  
  return kebabName + preservedSuffix;
}

/**
 * Check if a file should be excluded from validation
 */
function shouldExcludeFile(filePath: string, filename: string): boolean {
  // Exclude certain file patterns that are standard or generated
  const excludePatterns = [
    // Next.js specific files
    /^layout\.(tsx?|jsx?)$/,
    /^page\.(tsx?|jsx?)$/,
    /^loading\.(tsx?|jsx?)$/,
    /^error\.(tsx?|jsx?)$/,
    /^not-found\.(tsx?|jsx?)$/,
    /^route\.(tsx?|jsx?)$/,
    /^middleware\.(tsx?|jsx?)$/,
    /^globals\.css$/,
    
    // Common config/meta files
    /^index\.(tsx?|jsx?|js|ts)$/,
    /^README\.md$/,
    /^\..*$/, // Hidden files
    
    // Generated or build files
    /^next-env\.d\.ts$/,
    /.*\.d\.ts$/,
    
    // Config files
    /.*\.config\.(js|ts|mjs|cjs)$/,
    /.*\.json$/,
    
    // Asset files (images, fonts, icons, etc.)
    /.*\.(svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff?)$/i,
    /.*\.(woff2?|ttf|eot|otf)$/i,
    /.*\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
    /.*\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
    
    // Dynamic route files (Next.js pattern)
    /^\[.*\]\.(tsx?|jsx?)$/,
    /^\[.*\]$/,
  ];
  
  // Check if filename matches any exclude pattern
  const isExcluded = excludePatterns.some(pattern => pattern.test(filename));
  
  // Also exclude directories that are dynamic routes
  if (fs.statSync(filePath).isDirectory() && /^\[.*\]$/.test(filename)) {
    return true;
  }
  
  // Exclude entire public directory (assets)
  if (filePath.includes('/public/')) {
    return true;
  }
  
  return isExcluded;
}

/**
 * Validate file naming in a directory recursively
 */
function validateDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.next', '.next-build', 'build', 'dist', 'coverage', '.turbo'].includes(entry)) {
        continue;
      }
      
      // Validate directory name if not excluded
      if (!shouldExcludeFile(fullPath, entry)) {
        if (!isKebabCase(entry)) {
          ERRORS.push({
            file: fullPath,
            message: `Directory name "${entry}" should follow kebab-case convention`,
            suggestion: `Rename to "${toKebabCase(entry)}"`,
          });
        }
      }
      
      // Recursively validate subdirectory
      validateDirectory(fullPath);
    } else {
      // Validate file name if not excluded
      if (!shouldExcludeFile(fullPath, entry)) {
        if (!isKebabCase(entry)) {
          ERRORS.push({
            file: fullPath,
            message: `File name "${entry}" should follow kebab-case convention`,
            suggestion: `Rename to "${toKebabCase(entry)}"`,
          });
        }
      }
    }
  }
}

/**
 * Main validation function
 */
function validateFileNaming(): void {
  console.log('🔍 Validating file naming conventions for web directory...');

  const webDir = path.join(process.cwd(), 'packages/web');
  
  if (!fs.existsSync(webDir)) {
    console.log('❌ Web directory not found at packages/web');
    process.exit(1);
  }

  console.log(`  Checking files in: ${webDir}`);
  validateDirectory(webDir);

  // Report results
  if (ERRORS.length === 0) {
    console.log('✅ All files follow kebab-case naming conventions!');
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${ERRORS.length} file naming violations:\n`);

    ERRORS.forEach((error) => {
      console.log(`📁 ${error.file}`);
      console.log(`   ${error.message}`);
      console.log(`   💡 ${error.suggestion}\n`);
    });

    console.log('💡 Kebab-case convention:');
    console.log('   - Use lowercase letters and numbers only');
    console.log('   - Separate words with hyphens (-)');
    console.log('   - No underscores, spaces, or camelCase');
    console.log('   - Examples: user-profile.tsx, auth-button.tsx, api-client.ts');

    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateFileNaming();
}

export { validateFileNaming };