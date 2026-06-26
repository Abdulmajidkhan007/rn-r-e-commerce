import { baseConfig } from '@kidswear/config/eslint';

export default [
  {
    ignores: ['.expo/**', 'expo-env.d.ts', 'nativewind-env.d.ts', 'babel.config.js', 'metro.config.js'],
  },
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
];
