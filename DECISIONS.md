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
- Timestamps (`createdAt`/`updatedAt`) are ISO-8601 **strings** so they stay
  JSON-serializable (Redux/redux-persist friendly). A later Firestore phase can map
  `Timestamp` ↔ ISO string.
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
