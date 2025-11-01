/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@codervisor/eslint-config/react'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Allow console.error for error logging
    'no-console': ['warn', { allow: ['error'] }],
  },
};
