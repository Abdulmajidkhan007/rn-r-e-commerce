// Load apps/mobile/.env so the inline plugin can bake the values into the
// bundle at build time. Bare RN has no built-in env inlining, so this is the
// replacement for what Expo used to do for EXPO_PUBLIC_* vars.
require('dotenv').config();

// Only these names are inlined. The allowlist is deliberate: without it the
// plugin would substitute *any* process.env read, baking unrelated host/CI
// environment values into the shipped bundle.
const INLINED_ENV_VARS = [
  'RN_PUBLIC_FIREBASE_API_KEY',
  'RN_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'RN_PUBLIC_FIREBASE_PROJECT_ID',
  'RN_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'RN_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'RN_PUBLIC_FIREBASE_APP_ID',
  'RN_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'RN_PUBLIC_ADMIN_EMAIL',
  'RN_PUBLIC_GOOGLE_WEB_CLIENT_ID',
];

module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
  plugins: [
    // '@/x' -> './src/x' (mirrors the tsconfig paths alias for Metro).
    ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
    '@babel/plugin-transform-export-namespace-from',
    ['transform-inline-environment-variables', { include: INLINED_ENV_VARS }],
  ],
};
