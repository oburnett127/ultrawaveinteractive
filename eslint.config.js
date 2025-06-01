// eslint.config.js
import js from '@eslint/js';
import eslintPluginNext from 'eslint-plugin-next';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules',
      '.next',
      'dist',
      'logs',
    ],
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      next: eslintPluginNext,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
