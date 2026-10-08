import { defineConfig } from 'vitest/config';
import path from 'node:path';

const r = (p: string): string => path.resolve(__dirname, p);

// Workspace packages resolve to source, matching how the apps consume them
// (each package's "main" is src/index.ts — no build step in the test path).
const workspaceAliases = {
  '@kidswear/core': r('packages/core/src/index.ts'),
  '@kidswear/utils': r('packages/utils/src/index.ts'),
  '@kidswear/data': r('packages/data/src/index.ts'),
  '@kidswear/store': r('packages/store/src/index.ts'),
  '@kidswear/i18n': r('packages/i18n/src/index.ts'),
  '@kidswear/theme': r('packages/theme/src/index.ts'),
  '@kidswear/legal': r('packages/legal/src/index.ts'),
  '@kidswear/firebase': r('packages/firebase/src/index.ts'),
  '@kidswear/auth': r('packages/auth/src/index.ts'),
};

export default defineConfig({
  test: {
    projects: [
      // Pure, platform-agnostic logic. No DOM, no Firebase, no network.
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/**/*.test.ts', 'functions/src/**/*.test.ts'],
        },
      },
      // Web components. jsdom + Testing Library.
      {
        resolve: { alias: { ...workspaceAliases, '@': r('apps/web/src') } },
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: true,
          setupFiles: [r('test/setup.web.ts')],
          include: ['apps/web/**/*.test.{ts,tsx}'],
        },
      },
      // Firestore security rules. `firebase emulators:exec` sets
      // FIRESTORE_EMULATOR_HOST, so this project activates itself only when an
      // emulator is actually running — a bare `vitest run` stays green instead
      // of failing on a connection refused. Start it with `npm run test:rules`.
      ...(process.env.FIRESTORE_EMULATOR_HOST
        ? [
            {
              test: {
                name: 'rules' as const,
                environment: 'node' as const,
                include: ['test/rules/**/*.test.ts'],
                testTimeout: 20_000,
                hookTimeout: 20_000,
              },
            },
          ]
        : []),
    ],
  },
});
