/**
 * React-specific ESLint configuration
 * 
 * Extends the base configuration with:
 * - React and JSX rules
 * - React Hooks rules
 * - Accessibility (a11y) rules
 */

import base from './base.js';

export default {
  ...base,
  plugins: [...(base.plugins || []), 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    ...(Array.isArray(base.extends) ? base.extends : [base.extends]),
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parserOptions: {
    ...base.parserOptions,
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    ...base.settings,
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...base.rules,

    // React rules
    'react/prop-types': 'off', // Using TypeScript
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/jsx-uses-react': 'off',
    'react/jsx-curly-brace-presence': [
      'error',
      { props: 'never', children: 'never' },
    ],
    'react/self-closing-comp': 'error',
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-no-useless-fragment': 'error',
    'react/function-component-definition': [
      'error',
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility rules
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],

    // Allow default exports for React components (Next.js pages, etc.)
    'import/no-default-export': 'off',
  },
};
