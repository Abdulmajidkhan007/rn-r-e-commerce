import { baseConfig } from '@kidswear/config/eslint';

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        React: 'readonly',
        __DEV__: 'readonly',
      },
    },
  },
  {
    ignores: ['android/**', 'ios/**', 'dist/**', 'index.js', 'metro.config.js', 'babel.config.js', 'tailwind.config.js'],
  },
];
