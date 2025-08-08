#!/usr/bin/env node
/**
 * Migration script to update existing projects for GitHub-style naming
 * This script:
 * 1. Updates project names to follow GitHub naming conventions
 * 2. Ensures name uniqueness (case-insensitive)
 * 3. Handles any invalid characters by replacing them
 */

async function migrateProjectNames() {
  console.log('🚀 Starting project name migration...');
  
  try {
    // Dynamic imports for ES modules
    const { ProjectService } = await import('@codervisor/devlog-core');
    const { validateProjectName, generateUniqueProjectName } = await import('@codervisor/devlog-core');
    
    const projectService = ProjectService.getInstance();
    const projects = await projectService.list();
    
    console.log(`📋 Found ${projects.length} projects to check`);
    
    const existingNames = [];
    const projectUpdates = [];
    
    // First pass: identify projects that need updates
    for (const project of projects) {
      const currentName = project.name;
      
      if (validateProjectName(currentName)) {
        // Name is already valid, just track for uniqueness
        existingNames.push(currentName);
        console.log(`✅ "${currentName}" - already valid`);
      } else {
        // Name needs to be fixed
        let fixedName = currentName
          .replace(/\s+/g, '-')           // Replace spaces with hyphens
          .replace(/[^a-zA-Z0-9_-]/g, '') // Remove invalid characters
          .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
          .replace(/-+/g, '-');           // Collapse multiple hyphens
        
        if (!fixedName) {
          fixedName = `project-${project.id}`; // Fallback for empty names
        }
        
        // Ensure uniqueness
        const uniqueName = generateUniqueProjectName(fixedName, existingNames);
        existingNames.push(uniqueName);
        
        projectUpdates.push({
          id: project.id,
          currentName,
          newName: uniqueName
        });
        
        console.log(`🔄 "${currentName}" -> "${uniqueName}"`);
      }
    }
    
    if (projectUpdates.length === 0) {
      console.log('🎉 All project names are already valid! No migration needed.');
      return;
    }
    
    console.log(`\n📝 Planning to update ${projectUpdates.length} projects:`);
    projectUpdates.forEach(update => {
      console.log(`  - Project ${update.id}: "${update.currentName}" -> "${update.newName}"`);
    });
    
    // Confirm before proceeding
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const proceed = await new Promise((resolve) => {
      rl.question('\nDo you want to proceed with these updates? (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        rl.close();
      });
    });
    
    if (!proceed) {
      console.log('❌ Migration cancelled by user');
      return;
    }
    
    // Second pass: apply updates
    console.log('\n🔄 Applying updates...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of projectUpdates) {
      try {
        await projectService.update(update.id, { name: update.newName });
        console.log(`✅ Updated project ${update.id}: "${update.currentName}" -> "${update.newName}"`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update project ${update.id}: ${error}`);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`  - ✅ Successfully updated: ${successCount} projects`);
    if (errorCount > 0) {
      console.log(`  - ❌ Failed updates: ${errorCount} projects`);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateProjectNames()
    .then(() => {
      console.log('✨ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}
