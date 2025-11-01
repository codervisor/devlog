/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@codervisor/eslint-config/base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'bin/',
    '.next/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
  ],
};
