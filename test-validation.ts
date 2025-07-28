/**
 * Example usage of the validation system
 * 
 * This demonstrates how the multi-layer validation works in practice.
 */

import { ProjectValidator } from '@codervisor/devlog-core';

// Test valid project creation
console.log('Testing valid project creation...');
const validProject = {
  name: 'My Project',
  description: 'A test project',
  repositoryUrl: 'https://github.com/user/repo',
  settings: {
    defaultPriority: 'medium' as const,
    theme: 'dark',
    autoArchiveDays: 30,
  },
};

const validResult = ProjectValidator.validateCreateRequest(validProject);
console.log('Valid project result:', validResult);

// Test invalid project creation
console.log('\nTesting invalid project creation...');
const invalidProject = {
  name: '', // Empty name should fail
  description: 'A test project with a very long description that exceeds the maximum allowed length of 500 characters. This description is intentionally made very long to test the validation logic. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  repositoryUrl: 'not-a-valid-url',
  settings: {
    defaultPriority: 'invalid' as any, // Invalid priority
    autoArchiveDays: -5, // Negative days should fail
  },
};

const invalidResult = ProjectValidator.validateCreateRequest(invalidProject);
console.log('Invalid project result:', invalidResult);

// Test project update
console.log('\nTesting project update...');
const updateData = {
  name: 'Updated Project Name',
  settings: {
    defaultPriority: 'high' as const,
  },
};

const updateResult = ProjectValidator.validateUpdateRequest(updateData);
console.log('Update result:', updateResult);

// Test ID validation
console.log('\nTesting ID validation...');
const validId = ProjectValidator.validateProjectId(123);
console.log('Valid ID result:', validId);

const invalidId = ProjectValidator.validateProjectId(-1);
console.log('Invalid ID result:', invalidId);
