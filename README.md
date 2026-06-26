# KidsWear

A universal kids' clothing e-commerce platform — **React web** + **React Native (Expo)
mobile** in a single monorepo. Everything except UI is shared; the UI is implemented
separately per platform but driven by one shared design-token system, so both platforms
look like the same Material Design product.

> **Phase 2** — foundation + Firebase data layer + email/password authentication. Shared
> auth orchestration, real route guards, and auth/account UI on both platforms (login,
> register, forgot-password, and a view-only profile with logout). No biometric or profile
> editing yet; product/admin features are still placeholders.

## Tech stack

| Concern       | Web (`apps/web`)                             | Mobile (`apps/mobile`)                       |
| ------------- | -------------------------------------------- | -------------------------------------------- |
| Framework     | Vite + React + TypeScript (strict)           | Expo SDK 56 + Expo Router + TS (strict)      |
| UI / Material | MUI + Tailwind v4 (CSS-first)                | React Native Paper (MD3) + NativeWind v4     |
| Routing       | react-router-dom (createBrowserRouter)       | Expo Router (file-based)                     |
| State         | Redux Toolkit + redux-persist (localStorage) | Redux Toolkit + redux-persist (AsyncStorage) |
| i18n          | react-i18next + browser detector             | react-i18next + expo-localization            |

### Shared packages

| Package              | Responsibility                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@kidswear/core`     | Domain model as Zod schemas; types inferred via `z.infer` (single source of truth)                                                     |
| `@kidswear/firebase` | Platform-agnostic Firebase data layer: `initFirebase`, auth fns, typed Firestore converters/collections, data-access + storage helpers |
| `@kidswear/auth`     | Auth orchestration (react): zod schemas, `mapAuthError`, `useAuthActions` / `useAuthBootstrap` / `useAuth`                             |
| `@kidswear/store`    | Redux Toolkit slices (auth/cart/ui), `makeStore(storage)` factory, typed hooks                                                         |
| `@kidswear/i18n`     | react-i18next config, `initI18n(detector)`, uz/en/ru locales                                                                           |
| `@kidswear/theme`    | Pure-TS design tokens (colors, spacing, radii, typography)                                                                             |
| `@kidswear/utils`    | `formatPrice` (UZS), `formatDate`, etc.                                                                                                |
| `@kidswear/config`   | Shared ESLint (flat) + Prettier + base tsconfig                                                                                        |

## Getting started

Requires Node 20+ and npm 10+.

```bash
npm install
```

### Web

```bash
npm run dev --workspace @kidswear/web
# or: npx turbo run dev --filter @kidswear/web
# then open http://localhost:5173
```

### Mobile

```bash
cd apps/mobile
npx expo start
# press i / a for iOS / Android, or scan the QR with Expo Go
```

> Always install Expo/React Native dependencies with `npx expo install <pkg>` (run from
> `apps/mobile`) so versions stay compatible with the Expo SDK.

## Monorepo scripts (root)

```bash
npm run type-check   # turbo run type-check — tsc --noEmit everywhere
npm run lint         # turbo run lint — eslint everywhere
npm run build        # turbo run build
npm run format       # prettier --write
```

## Authentication

Email/password via Firebase Auth. Copy each app's `.env.example` to `.env` and fill in your
Firebase project's web-app config (`VITE_FIREBASE_*` for web, `EXPO_PUBLIC_FIREBASE_*` for
mobile) so login/register actually talk to Firebase.

**Granting admin.** Admin authority is the Firebase custom claim `role: 'admin'` — the
Firestore profile role is only a UX mirror. Set it out-of-band with the admin script (never
commit the service-account key):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
  node scripts/set-admin-claim.ts <uid>
```

The user must sign out/in afterward to refresh their token.

## Conventions

- **Types are derived from Zod schemas only** — never hand-write a duplicate interface.
- **No `any`** — `@typescript-eslint/no-explicit-any` is an error.
- **Currency** is UZS, stored as integer som, formatted with `Intl.NumberFormat`.
- **Languages**: uz (default + fallback), en, ru.
- UI is implemented per platform; visual consistency comes only from shared tokens.

See [`DECISIONS.md`](./DECISIONS.md) for the rationale behind key choices.
