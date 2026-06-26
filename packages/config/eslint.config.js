import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Shared flat ESLint config for the KidsWear monorepo.
 * typescript-eslint (strict) + react-hooks, with no-explicit-any as an error.
 *
 * Consumers extend it from their own eslint.config.js:
 *
 *   import { baseConfig } from '@kidswear/config/eslint';
 *   export default [...baseConfig];
 */
export const baseConfig = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/metro.config.js',
      '**/babel.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  prettier,
);

export default baseConfig;
