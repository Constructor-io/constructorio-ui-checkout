import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import storybookPlugin from 'eslint-plugin-storybook';
import cspellPlugin from '@cspell/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vitestPlugin from '@vitest/eslint-plugin';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import noSnapshotPlugin from 'eslint-plugin-no-snapshot-testing';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '*.config.mjs',
      'lib/**/*.js',
      'lib/**/*.d.ts',
      'docs/**/*.js',
      'spec/setup.ts',
      'spec/__mocks__/**',
      'node_modules/',
      'dist/',
      'storybook-static/',
    ],
  },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // projectService: TS-ESLint's project-service mode. More reliable than
        // `project: 'tsconfig.json'` (a relative path) — VSCode's ESLint
        // extension resolves per-file consistently, avoiding the false-positive
        // no-unsafe-* errors that appear when a file is processed without its
        // tsconfig context.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['{src,spec,stories}/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
      '@typescript-eslint': tseslint.plugin,
      '@cspell': cspellPlugin,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'stories/**/*.*',
            '**/.storybook/**/*.*',
            'spec/**/*.*',
            '**/*.test.{js,jsx,ts,tsx}',
          ],
          peerDependencies: true,
        },
      ],
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'prettier/prettier': ['error'],
      'react/require-default-props': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prefer-stateless-function': 'off',
      'react/jsx-props-no-spreading': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'global-require': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^react$', '^react-dom$'],
            ['^@?\\w'],
            ['^@spec(/.*|$)'],
            ['^@stories(/.*|$)'],
            ['^@src(/.*|$)'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'sort-imports': 'off',
      'import/order': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
        },
      ],
      'max-len': [
        'error',
        120,
        2,
        {
          ignoreUrls: true,
          ignoreComments: false,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      'object-curly-newline': 'off',
      'padded-blocks': 'off',
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 5],
      'max-params': ['error', 4],
      complexity: ['error', 20],
      '@cspell/spellchecker': ['error'],
    },
  },
  {
    files: [
      'stories/**/*.stories.{js,jsx,ts,tsx}',
      '.storybook/**/*.{js,jsx,ts,tsx}',
    ],
    plugins: {
      storybook: storybookPlugin,
    },
  },
  {
    files: ['spec/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    plugins: {
      vitest: vitestPlugin,
      import: importPlugin,
      'testing-library': testingLibraryPlugin,
      'no-snapshot-testing': noSnapshotPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      ...testingLibraryPlugin.configs['flat/react'].rules,
      'vitest/consistent-test-it': [
        'error',
        { fn: 'test', withinDescribe: 'it' },
      ],
      'vitest/prefer-hooks-in-order': 'error',
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/require-top-level-describe': 'error',
      'no-snapshot-testing/no-snapshot-testing': 'error',
      'testing-library/no-node-access': [
        'error',
        { allowContainerFirstChild: true },
      ],
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: true, peerDependencies: true },
      ],
    },
  }
);
