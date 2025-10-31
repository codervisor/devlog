#!/usr/bin/env node

/**
 * Unified spec management script
 * Usage: 
 *   node scripts/specs/spec.js create <short-name> [title]
 *   node scripts/specs/spec.js list [date-folder]
 *   node scripts/specs/spec.js archive <date-folder> [spec-folder]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SPECS_DIR = path.join(ROOT_DIR, 'specs');
const ARCHIVE_DIR = path.join(SPECS_DIR, 'archive');

// ========== Utility Functions ==========

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getNextSpecNumber(dateFolder) {
  const datePath = path.join(SPECS_DIR, dateFolder);
  
  if (!fs.existsSync(datePath)) {
    return '001';
  }

  const entries = fs.readdirSync(datePath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => /^\d{3}-/.test(name));

  if (entries.length === 0) {
    return '001';
  }

  const numbers = entries.map(name => parseInt(name.slice(0, 3), 10));
  const maxNumber = Math.max(...numbers);
  return String(maxNumber + 1).padStart(3, '0');
}

function extractStatus(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
    return statusMatch ? statusMatch[1].trim() : '❓ Unknown';
  } catch (error) {
    return '❓ Unknown';
  }
}

// ========== Command: create ==========

function createSpec(shortName, title) {
  // Validate short name
  if (!/^[a-z0-9-]+$/.test(shortName)) {
    console.error('Error: Short name must contain only lowercase letters, numbers, and hyphens');
    process.exit(1);
  }

  const dateFolder = formatDate();
  const specNumber = getNextSpecNumber(dateFolder);
  const specFolderName = `${specNumber}-${shortName}`;
  const specPath = path.join(SPECS_DIR, dateFolder, specFolderName);

  // Create the spec directory
  fs.mkdirSync(specPath, { recursive: true });

  // Create default README.md
  const readmeContent = `# ${title || shortName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

**Status**: 📅 Planned  
**Created**: ${new Date().toISOString().split('T')[0]}  
**Spec**: \`${dateFolder}/${specFolderName}\`

## Overview

<!-- Brief description of what this spec covers -->

## Objectives

<!-- What are we trying to achieve? -->

## Design

<!-- Technical design details -->

## Implementation Plan

<!-- Step-by-step implementation approach -->

## Success Criteria

<!-- How do we know when this is complete? -->

## References

<!-- Links to related docs, issues, PRs -->
`;

  fs.writeFileSync(path.join(specPath, 'README.md'), readmeContent);

  console.log(`✅ Created spec: ${dateFolder}/${specFolderName}`);
  console.log(`📁 Path: ${specPath}`);
  console.log(`📝 Edit: ${path.join(specPath, 'README.md')}`);
}

// ========== Command: list ==========

function listSpecs(dateFilter) {
  if (!fs.existsSync(SPECS_DIR)) {
    console.log('No specs directory found.');
    return;
  }

  const dateFolders = fs.readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'archive' && /^\d{8}$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
    .reverse();

  if (dateFolders.length === 0) {
    console.log('No specs found.');
    return;
  }

  const filteredFolders = dateFilter 
    ? dateFolders.filter(folder => folder === dateFilter)
    : dateFolders;

  if (filteredFolders.length === 0) {
    console.log(`No specs found for date: ${dateFilter}`);
    return;
  }

  console.log('\n📋 Active Specs\n');

  for (const dateFolder of filteredFolders) {
    const datePath = path.join(SPECS_DIR, dateFolder);
    const specs = fs.readdirSync(datePath, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^\d{3}-/.test(entry.name))
      .map(entry => entry.name)
      .sort();

    if (specs.length === 0) continue;

    console.log(`\n📅 ${dateFolder}`);
    console.log('─'.repeat(60));

    for (const spec of specs) {
      const specPath = path.join(datePath, spec);
      const readmePath = path.join(specPath, 'README.md');
      const designPath = path.join(specPath, 'design.md');
      
      let status = '❓ Unknown';
      let title = spec.replace(/^\d{3}-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      if (fs.existsSync(readmePath)) {
        status = extractStatus(readmePath);
        const content = fs.readFileSync(readmePath, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) title = titleMatch[1].trim();
      } else if (fs.existsSync(designPath)) {
        status = extractStatus(designPath);
        const content = fs.readFileSync(designPath, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) title = titleMatch[1].trim();
      }

      console.log(`  ${spec.slice(0, 3)} ${title}`);
      console.log(`      ${status}`);
      console.log(`      📁 ${dateFolder}/${spec}`);
    }
  }

  console.log('\n');
}

// ========== Command: archive ==========

function archiveSpec(dateFolder, specFolder) {
  const sourcePath = specFolder 
    ? path.join(SPECS_DIR, dateFolder, specFolder)
    : path.join(SPECS_DIR, dateFolder);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Path does not exist: ${sourcePath}`);
    process.exit(1);
  }

  const destPath = specFolder
    ? path.join(ARCHIVE_DIR, dateFolder, specFolder)
    : path.join(ARCHIVE_DIR, dateFolder);

  // Create archive directory
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // Move to archive
  fs.renameSync(sourcePath, destPath);

  console.log(`✅ Archived: ${dateFolder}${specFolder ? '/' + specFolder : ''}`);
  console.log(`📁 Location: ${destPath}`);

  // Clean up empty date folder if needed
  if (specFolder) {
    const datePath = path.join(SPECS_DIR, dateFolder);
    if (fs.existsSync(datePath) && fs.readdirSync(datePath).length === 0) {
      fs.rmdirSync(datePath);
      console.log(`🧹 Cleaned up empty date folder: ${dateFolder}`);
    }
  }
}

// ========== Main CLI ==========

function printUsage() {
  console.log(`
Spec Management Tool

Usage:
  pnpm spec create <short-name> [title]     Create a new spec
  pnpm spec list [date]                      List all specs (or filter by date)
  pnpm spec archive <date> [spec-folder]     Archive a spec or entire date

Examples:
  pnpm spec create "database-architecture" "Database Architecture Design"
  pnpm spec list
  pnpm spec list 20251031
  pnpm spec archive 20251031 001-database-architecture
  pnpm spec archive 20251031
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  printUsage();
  process.exit(1);
}

switch (command) {
  case 'create': {
    const [, shortName, ...titleParts] = args;
    if (!shortName) {
      console.error('Error: Short name is required');
      console.error('Usage: pnpm spec create <short-name> [title]');
      process.exit(1);
    }
    const title = titleParts.join(' ');
    createSpec(shortName, title);
    break;
  }

  case 'list': {
    const [, dateFilter] = args;
    listSpecs(dateFilter);
    break;
  }

  case 'archive': {
    const [, dateFolder, specFolder] = args;
    if (!dateFolder) {
      console.error('Error: Date folder is required');
      console.error('Usage: pnpm spec archive <date-folder> [spec-folder]');
      process.exit(1);
    }
    archiveSpec(dateFolder, specFolder);
    break;
  }

  default:
    console.error(`Error: Unknown command '${command}'`);
    printUsage();
    process.exit(1);
}
