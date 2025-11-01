/**
 * Node.js-specific ESLint configuration
 * 
 * Extends the base configuration with Node.js-specific rules
 */

import base from './base.js';

export default {
  ...base,
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    ...base.rules,

    // Node.js specific rules
    'no-process-exit': 'error',
    'no-path-concat': 'error',

    // Allow console in Node.js
    'no-console': 'off',

    // Prefer modern Node.js patterns
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
  },
};
