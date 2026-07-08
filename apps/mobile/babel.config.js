// Load apps/mobile/.env so the inline plugin can bake the values into the
// bundle — the bare-RN replacement for Expo's EXPO_PUBLIC_* inlining.
// Variable names keep the EXPO_PUBLIC_ prefix to avoid churn in .env files.
require('dotenv').config();

module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
  plugins: [
    // '@/x' -> './src/x' (mirrors the tsconfig paths alias for Metro).
    ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
    '@babel/plugin-transform-export-namespace-from',
    'transform-inline-environment-variables',
  ],
};
