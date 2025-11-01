/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@codervisor/eslint-config/node'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
