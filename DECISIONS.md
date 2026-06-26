# Architecture Decisions

A running log of notable choices. Phase 0 (foundation) entries below.

## Monorepo

- **npm workspaces + Turborepo**, flat `node_modules` (EAS/Metro-friendly). No pnpm/yarn.
- Workspaces: `apps/*`, `packages/*`. Internal packages are referenced as `"*"` so npm
  symlinks the local source; each package's `main`/`types` point at `src/index.ts` (no
  build step needed for type-checking or bundling, since Vite and Metro consume TS source).
- Package names are scoped `@kidswear/*`.

## TypeScript

- Single `tsconfig.base.json` at the root; every app/package extends it.
- `strict: true` and `noUncheckedIndexedAccess: true` are enabled.
- **`exactOptionalPropertyTypes` was left OFF.** It fights MUI and i18next typings
  (overload resolution failures on `<Box>`/`<Typography>`, `init()` options), which the
  prompt explicitly allowed avoiding ("…if it doesn't fight dependencies"). It does.
- The latest TypeScript (6.x) deprecates `baseUrl`. Path aliases are therefore declared
  with `./`-relative targets and **no `baseUrl`**.
- Path aliases: `@/*` for app-internal code; `@kidswear/*` resolved via workspaces and
  mirrored in each app's `tsconfig` `paths` for editor/`tsc` resolution.

## Domain model (`@kidswear/core`)

- Zod schemas are the single source of truth; types are `z.infer<typeof XSchema>`.
- Timestamps (`createdAt`/`updatedAt`) are **epoch milliseconds (`number`)** — see the
  Firebase section for why this changed from the original ISO-string plan.
- A cart/order line's identity is `productId + size + color`.

## State (`@kidswear/store`)

- `makeStore(storage)` is a factory taking a redux-persist storage engine, so web passes
  the localStorage engine and mobile passes AsyncStorage. **Only `cart` + `ui` are
  persisted**; `auth` is rehydrated from the backend in a later phase.
- Typed `useAppDispatch`/`useAppSelector`/`useAppStore` via react-redux `.withTypes<>()`.
- Store providers use a lazy `useState(() => makeStore(...))` initializer rather than a
  ref, to satisfy the React Compiler `react-hooks/refs` lint rule.

## i18n (`@kidswear/i18n`)

- One shared react-i18next instance; `initI18n({ detector })` lets each platform inject a
  detector (web: `i18next-browser-languagedetector`; mobile: a custom expo-localization
  detector). uz is default + fallback. `react-i18next` type augmentation gives typed keys.

## Theme (`@kidswear/theme`)

- Pure-TS tokens, **no platform imports**. Web maps them to an MUI `createTheme` + Tailwind
  `@theme`; mobile maps them to a Paper MD3 theme + NativeWind config.
- Token hex values are duplicated into `apps/web/src/index.css` (`@theme`) and
  `apps/mobile/tailwind.config.js` because those files are CSS/CommonJS and cannot import
  the TS token module. Keep them in sync with `packages/theme/src`.

## Web (`apps/web`)

- Tailwind v4 is CSS-first (`@import "tailwindcss"`, no config file). Cascade layer order
  `@layer theme, base, mui, components, utilities;` plus `<StyledEngineProvider
enableCssLayer>` puts MUI styles in the `mui` layer so **Tailwind utilities win**.
- **MUI v9 removed the shorthand system props** (`display`, `alignItems`, `fontWeight`, …)
  from `Box`/`Stack`/`Typography`; all such styling goes through `sx`.
- Routing via `createBrowserRouter` with lazy route modules. `RequireAuth`/`RequireAdmin`
  are allow-all stubs reading the auth slice (TODO: enforce when auth lands).

## Mobile (`apps/mobile`)

- Expo SDK 56, all native deps pinned to the SDK's `bundledNativeModules` versions (the
  same versions `npx expo install` would resolve).
- **NativeWind v4 is paired with Tailwind v3.4** (its fully-supported version); the web app
  independently uses Tailwind v4. npm nests the two versions per workspace.
- Metro uses `expo/metro-config` with monorepo `watchFolders`/`nodeModulesPaths` and
  `withNativeWind`.
- **`admin` is a real path segment, not a `(admin)` group.** A group's `index` route would
  resolve to `/` and collide with `(public)/index`. Using `admin/` mirrors the web URLs
  (`/admin`, `/admin/products`, `/admin/orders`). `(public)` and `(auth)` remain groups.
- `product/[id]` lives in the `(public)` tabs layout but is hidden from the tab bar via
  `<Tabs.Screen … options={{ href: null }} />`.
- `react-native-reanimated`/`worklets` were **not** added in Phase 0 — nothing needs them
  yet, and omitting them keeps the babel config minimal. Add via `expo install` when needed.

## Firebase (`@kidswear/firebase`) — Phase 1

- **Firebase JS SDK (modular), one version across the workspace.** Pure JS, so it works on
  both web and React Native with no native module and no `expo install`. We deliberately do
  **not** use `@react-native-firebase`.
- **Platform-agnostic package.** `@kidswear/firebase` never imports `react-native` or
  AsyncStorage and never reads env. Each app injects what's platform-specific:
  - **config** — the app reads its own env (web: `VITE_FIREBASE_*` via `import.meta.env`;
    mobile: `EXPO_PUBLIC_FIREBASE_*` via `process.env`) and passes a `FirebaseOptions`.
  - **auth persistence** — web injects `browserLocalPersistence`; mobile injects
    `getReactNativePersistence(AsyncStorage)`.
    `initFirebase({ config, persistence })` guards against double-init; `getFirebase()` throws
    a clear error if called before init.
- **Timestamps: Firestore `Timestamp` ↔ epoch ms (`number`).** Core schemas type
  `createdAt`/`updatedAt` as `number` for cross-platform use and redux-persist
  serializability. The Zod-based converter maps `Timestamp.toMillis()` on read and writes
  `serverTimestamp()` on create/update. (This replaces Phase 0's ISO-string plan.)
- **Typed collections via Zod converters built from `@kidswear/core`.** Types are never
  redefined; write-input types are `Omit<…, 'id' | 'createdAt' | 'updatedAt'>`. Collection
  refs are functions (not module constants) because the Firestore instance only exists after
  `initFirebase`. Reads go through converter-bound refs; auto-id creates use
  `doc(col)` + `setDoc` so the generated id is available and still validated.
- **Data strategy = Firestore real-time.** Every collection exposes both one-shot getters
  and `subscribe*` helpers returning a typed `Unsubscribe`.
- **`getReactNativePersistence` ts-ignore.** It is a valid runtime export of firebase/auth's
  RN build (Metro resolves it) but is absent from the browser-oriented type declarations.
  The mobile bootstrap carries the single allowed `// @ts-ignore` (with explanation);
  `@ts-expect-error` can't be used because the symbol may resolve without error. The shared
  ESLint config sets `ban-ts-comment` to `allow-with-description` so suppressions must be
  justified.
- **Rules & indexes are authored, not deployed.** `firestore.rules`, `firestore.indexes.json`,
  `storage.rules`, and `firebase.json` live at the repo root. Custom-claim `role == 'admin'`
  gates admin writes; orders/users are owner-or-admin scoped; storage uploads are images
  under 2MB.
- **Env files**: `.env.example` (committed placeholders) per app; real `.env` is gitignored.

## Authentication (`@kidswear/auth`) — Phase 2

- **Email/password via Firebase Auth.** Session persistence is the one wired in Phase 1
  (browser localStorage on web, AsyncStorage on mobile) — not re-added — so login survives
  reload/restart.
- **Admin authority = custom claim `role: 'admin'`**, read via `getIdTokenResult().claims.role`.
  `UserProfile.role` in Firestore is only a UX mirror and is never client-elevatable (rules
  enforce). The claim is set **out-of-band** by `scripts/set-admin-claim.ts` (firebase-admin,
  gitignored service-account key). `VITE_ADMIN_EMAIL` / `EXPO_PUBLIC_ADMIN_EMAIL` are UX-only.
- **`@kidswear/auth` owns all orchestration; the store stays thunk-free.** authSlice exposes
  only plain actions (`setAuthLoading`, `setAuthenticated`, `setUnauthenticated`,
  `setAuthError`, `clearAuthError`). The hooks (`useAuthActions`, `useAuthBootstrap`,
  `useAuth`) are the single seam tying firebase + store together, which avoids a
  store→firebase circular dependency.
- **One auth subscription** (`useAuthBootstrap`) is installed at each app root; it loads the
  profile + claims (creating a default `customer` profile if missing) and a splash is shown
  until status leaves `'idle'`.
- **Validation with zod + react-hook-form.** Schemas live in `@kidswear/auth`
  (`loginSchema`/`registerSchema`/`forgotSchema`); messages are i18n keys. `mapAuthError`
  maps Firebase `auth/*` codes to localized keys with a generic fallback.
- **Typed-i18n escape hatch.** Because `t()` is typed to known keys, runtime keys (zod
  messages, stored error keys) go through a small `useTranslateKey` helper
  (`t(key, { defaultValue: key })`) in each app.
- **Guards/redirects.** Web: `RequireAuth` (preserves intended path) and `RequireAdmin`.
  Mobile: `<Redirect>` in the profile screen and the admin group layout; `(public)` browsing
  (home/catalog/cart) stays open while signed out.
