import jsESLint from '@eslint/js';
import prettierConfigResolve from 'eslint-config-prettier';
import jsoncPlugin from 'eslint-plugin-jsonc';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import jsoncParser from 'jsonc-eslint-parser';
import tsESLint from 'typescript-eslint';

const ignores = [
  'dist',
  'node_modules',
  'package-lock.json',
  'coverage',
  '.storybook',
  'storybook-static',
  'out',
  '.idea',
];

/** @type {import('typescript-eslint').Config} */
export default tsESLint.config(
  {
    ignores,
  },
  jsESLint.configs.recommended,
  tsESLint.configs.strict,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  prettierConfigResolve,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.web.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': ['warn', {allow: ['warn', 'error', 'info']}],
      curly: ['warn', 'all'],
      'prettier/prettier': ['warn', {endOfLine: 'auto'}],
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            // Libraries (starting with a letter or @, but not @/)
            // ^react is placed at the top for aesthetics
            ['^react', '^@?\\w'],
            // project's imports
            ['^@/', '^\\.'],
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{json,jsonc}'],
    languageOptions: {parser: jsoncParser},
    plugins: {
      jsonc: jsoncPlugin,
    },
    rules: {
      'jsonc/sort-keys': 'warn',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js', 'vitest.setup.ts', 'electron.vite.config.ts'],
    extends: [tsESLint.configs.disableTypeChecked],
  }
);
