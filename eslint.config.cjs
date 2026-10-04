// eslint.config.cjs — ESLint flat configuration for the whole monorepo.
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');
const globals = require('globals');

const typescriptRules = {
  ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
  ...tsPlugin.configs.recommended.rules,
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
};

const importRules = {
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      pathGroups: [{ pattern: '@/**', group: 'internal' }],
      pathGroupsExcludedImportTypes: ['builtin'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    },
  ],
  'import/no-duplicates': 'error',
};

const baseRules = {
  'prefer-const': 'error',
  'no-var': 'error',
  'object-shorthand': 'error',
  'prefer-template': 'error',
  eqeqeq: ['error', 'always'],
  'no-console': 'warn',
};

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'research/results/**',
      '**/*.d.ts',
    ],
  },
  // TypeScript everywhere
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: { ...globals.es2021 },
    },
    plugins: { '@typescript-eslint': tsPlugin, import: importPlugin },
    settings: {
      'import/internal-regex': '^(@taskverse/|@/)',
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
    },
    rules: { ...baseRules, ...typescriptRules, ...importRules },
  },
  // Node code
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'research/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Browser code
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Tests and scripts may log and use test globals
  {
    files: ['**/*.test.ts', '**/tests/**/*.ts', '**/*.spec.ts', 'research/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
  // Config files
  {
    files: [
      '**/*.config.{js,cjs,mjs,ts}',
      '**/vite.config.ts',
      '**/playwright.config.ts',
      '**/tailwind.config.js',
      '**/postcss.config.js',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off', '@typescript-eslint/no-var-requires': 'off' },
  },
  prettier,
];
