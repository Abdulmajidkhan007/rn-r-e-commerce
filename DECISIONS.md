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
- A cart/order line's identity is `productId + size + color`. Since product variants
  (2026-10-22) that pair is also the variant identity; lines additionally carry an optional
  `variantId` (see "Product variants").

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

> **Superseded (2026-07):** the app was migrated from Expo to **bare React Native
> CLI** (React Native 0.85, React Navigation 7, React Native Paper, NativeWind v4) —
> see commits `c78b517` / `54c518e`. The Expo SDK, expo-router and `expo/metro-config`
> notes below are kept as history of the original decision, not current state.

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

## Biometric AppLock & Profile Editing (Phase 3)

- **Biometric AppLock is mobile-only and lives entirely in `apps/mobile`.** Shared packages
  stay platform-agnostic — they never import `expo-local-authentication`, `expo-secure-store`,
  or `react-native`. Web has no biometric; its Security section just points to the mobile app.
- **AppLock guards an already-authenticated Firebase session locally; it is not auth.** The
  Firebase session remains the real source of truth. SecureStore holds **only a boolean**
  (`BIOMETRIC_ENABLED`) — never a password or credential.
- **Lock state is ephemeral (never persisted).** A session starts LOCKED on cold launch only
  when `authenticated && enabled && isAvailable`; it also re-locks after returning from the
  background for >30s (AppState listener). Provider order is **AuthGate → AppLockProvider →
  app**, so the lock can only apply to a resolved, signed-in session.
- **Never trap the user.** If biometric is enabled but no longer available/enrolled, the app
  auto-unlocks and surfaces a one-time notice. The LockScreen always offers Retry and Sign
  out (which clears the session and the lock).
- **Live biometric requires a development build (EAS) — not testable in Expo Go/sandbox.**
  Verified here by compile + `expo export` and by introspecting the config plugin
  (`NSFaceIDUsageDescription` is injected). Native module versions are pinned from the SDK 56
  `bundledNativeModules` manifest (`expo-local-authentication`/`expo-secure-store` ~56.0.4).
- **`Address` gained a stable `id`** (client-generated) as the key for edit/delete. Addresses
  remain **embedded in the user document** (no new collection); add/edit/delete mutate the
  array via `upsertUserProfile`.
- **`@kidswear/utils.genId()`** is a dependency-free `${ts}-${rand}` id — fine for address
  keys (no cryptographic guarantee needed).
- **Profile/address orchestration lives in `@kidswear/auth`** (`useProfileActions`,
  `useAddressActions`): both write via `upsertUserProfile` (merge) and update the auth slice
  while preserving `isAdmin`. No platform imports — used by both web and mobile UIs.
- **One justified `eslint-disable`** (`react-hooks/set-state-in-effect`) on the AppLock
  cold-launch effect: it synchronizes lock state from external systems (auth + SecureStore +
  biometric) and only sets state after awaiting those reads, so the cascading-render warning
  is a false positive there. (Distinct from the one documented `@ts-ignore`.)

## Catalog & data layer (`@kidswear/data`) — Phase 4

- **Server state vs client state split.** Catalog **reads** use TanStack Query (v5) via the
  new platform-agnostic `@kidswear/data` package (react + firebase + core only — no
  native/MUI/Paper imports). Client state (cart/ui/auth) stays in Redux. Real-time
  `onSnapshot` is intentionally **reserved for orders/admin** in later phases; the catalog is
  fine with cached one-shot fetches (`staleTime` 60s, `retry` 1, `refetchOnWindowFocus` off).
- **Search + sort are client-side.** Products are fetched active (optionally category-filtered
  server-side via the existing composite index), then filtered by free-text across
  `name.{uz,en,ru}` and sorted (`newest`/`priceAsc`/`priceDesc`) in a memoized derivation.
  The products query key only includes `categoryId`, so typing search / changing sort never
  refetches. **Caveat:** this suits a small catalog; a larger one needs server-side
  search/pagination (e.g. Algolia) — deferred.
- **Both apps wrap the tree in `QueryClientProvider`** with `makeQueryClient()` alongside the
  Redux Provider. The client is created once at module scope per app.
- **Localized display** uses `@kidswear/utils.pickLocalized` (uz fallback) via a per-app
  `useLocalized` hook bound to `ui.language`. `stockStatus` (in/low/out) is a shared util.
- **Seed script** `scripts/seed.ts` (firebase-admin, gitignored key) inserts ~5 categories and
  ~15 products with localized text, UZS integer prices, sizes/colors, a stock mix, and
  **placeholder image URLs** (picsum). Real images come in the admin/image phase.
- Add-to-cart reuses the existing `cartSlice.addItem` (persisted), so the cart badge survives
  reload/restart. No checkout/admin/image-upload in this phase.

## Cart & Checkout (Phase 5)

- **50% deposit model.** `@kidswear/utils.computeOrderTotals` (pure): `subtotal =
Σ price×qty`, `depositAmount = round(subtotal × DEPOSIT_RATE=0.5)`, `total = subtotal`
  (remaining = total − deposit). UZS integer som throughout.
- **Rules-aware "create-in-final-state".** Firestore rules forbid client order updates, so
  checkout runs the (stubbed) payment FIRST, then `createOrder` in its final state
  (`status:'deposit_paid'`, `paidAmount == depositAmount`) in a single create — never
  create-then-update from the client. A real gateway would instead create a `pending` order
  and confirm payment server-side via a webhook/Cloud Function; documented for Phase 7.
- **Payment is a stub behind an interface.** `PaymentService.payDeposit(orderRef, amount)`
  with `mockPaymentService` (resolves success after a short delay). No card data collected; a
  real provider drops in without touching checkout logic.
- **No client stock writes.** Rules forbid product writes; stock decrement is deferred to
  Cloud Functions (Phase 7). Checkout does a READ-ONLY stock re-check (re-fetch each product)
  and blocks the order if any requested qty exceeds current stock.
- **Real-time orders vs cached catalog.** `useUserOrders` / `useOrder` use Firestore
  `onSnapshot` (live), coexisting with the TanStack Query catalog hooks (cached one-shot
  reads). Cancellation (`useCancelOrder`) is a Query mutation; owners may cancel only from
  `pending`/`deposit_paid` (rules enforce a status-only change to `cancelled`).
- **`@kidswear/data` stays store-agnostic.** `useCheckout` takes `{ userId, items,
shippingAddress }` and returns `{ orderId }`; the app layer clears the cart on success
  (the data package never imports Redux). Thrown error keys are i18n keys resolved by the UI.
- **Orders rules updated** (authored, not deployed): create requires a valid initial state
  (deposit_paid ⇒ paidAmount == depositAmount; pending ⇒ paid 0) with required fields; update
  is admin, or an owner cancelling a pending/deposit_paid order via a status-only change.

## Image pipeline & Admin (Phase 6)

- **Image pipeline is shared where it can be, split where it must be.** The orchestration
  (`ImageUploadField`, the upload-to-Storage call) is identical per platform, but capture +
  encode are inherently native: web uses a hidden file input + `createImageBitmap` →
  `<canvas>` → `toBlob('image/webp')`; mobile uses `expo-image-picker` + the **new**
  `expo-image-manipulator` contextual API (`manipulate(uri).resize().renderAsync().saveAsync({
  format: WEBP })`) — **not** the deprecated `manipulateAsync`. Both end at a `Blob` so the
  upload (`@kidswear/firebase` Storage helpers) is common. All images are stored as `.webp`.
- **Native modules pinned from the SDK 56 manifest** (`expo-image-picker`,
  `expo-image-manipulator`); the image-picker config plugin injects the iOS photo/camera
  permission strings (verified via `expo config --type introspect`).
- **Pre-generated doc ids.** `newProductId()` / `newCategoryId()` allocate the Firestore id
  up-front so image storage paths (`product-images/{id}/{n}.webp`) are final before the
  document write — no rename/copy after the fact.
- **Avatar removal needs `deleteField()`.** A merge `setDoc` can't drop a field and an empty
  string fails the `avatarUrl` URL schema, so `setUserAvatar(uid, null)` uses
  `deleteField()`. Orchestrated by `@kidswear/auth.useProfileActions.updateAvatar`, which also
  syncs the auth slice.
- **Category image is a URL field, not an upload.** The authored Storage rules only cover
  `product-images/**` and `avatars/**`; rather than widen the rules this phase, category
  images are an optional `imageUrl`. Empty input is dropped before write so it never fails the
  `url()` schema on read.
- **Admin reads vs storefront reads.** `useAdminProducts` fetches **all** products (incl.
  inactive) under key `['products','admin']`, nested beneath `['products']` so product
  mutations invalidate it too; the storefront `useProducts` still restricts to active.
- **Admin order management is real-time.** `subscribeAllOrders` (onSnapshot, optional status
  filter) feeds `useAllOrders`; `useUpdateOrderStatus` is a Query mutation. Admin authority is
  the existing `role:'admin'` custom claim + `RequireAdmin` / Expo Router admin segment. **The
  client never writes product stock** — that stays deferred to Cloud Functions (Phase 7).
- **Dashboard aggregation is client-side and pure.** `summarizeDashboard(orders, products)`
  (in `@kidswear/data`, no UI imports) computes totals/low-stock/by-status/deposits. Web
  renders one `recharts` bar chart (orders by status) + stat cards; mobile shows stat cards +
  a status breakdown (no chart dep). **Caveat:** in-memory scan suits modest catalogs; at
  scale replace with server-side counters / a scheduled aggregation.
- **Shared `slugify`** (`@kidswear/utils`, dependency-free, small uz transliteration map)
  powers the category slug auto-suggest on both platforms; category deletion is guarded in the
  UI when products still reference it.

## Cloud Functions & Push (Phase 7)

- **`/functions` is a separate workspace.** Its own `tsconfig.json` (Node 20, ESM), its own
  `package.json`, no imports from `/apps` or `/packages`. Order/OrderStatus shapes are
  intentionally duplicated inline in `functions/src/types.ts` to keep the deploy artifact
  self-contained and avoid pulling the entire monorepo into the Functions container. The
  duplication is small (the trigger only reads `userId`, `items`, `status`, `total`,
  `shippingAddress.fullName`, `cancelReason`) and the cost is acceptable for the isolation.
- **Region `us-central1`** (Firebase Functions v2 default). Documented for ops; can be
  changed later by editing the global option, but pinning matches the default project region
  most teams start with.
- **Server-side stock decrement closes the Phase 5 deferral.** `onOrderCreate` runs a single
  Firestore transaction: per unique productId, read current stock; if any line exceeds it,
  update the order to `{ status:'cancelled', cancelReason:'out_of_stock' }` and skip the
  decrements; otherwise decrement each product atomically. Client checkout still does a
  read-only stock re-check (Phase 5) — Functions are the authoritative writer.
- **Dual push channels.** Mobile uses the **Expo Push Service** (Expo SDK 56 standard
  pipeline; tokens via `expo-notifications` + EAS projectId). Web uses **FCM** (Firebase
  Messaging Web SDK + a `firebase-messaging-sw.js` service worker). Tokens are stored on
  `users/{uid}.pushTokens.{expo|fcm}` — arrays so a single user can receive on multiple
  devices. Functions' `sendToUid` fans out across both channels.
- **Bad-token cleanup in the trigger.** Expo tickets returning `DeviceNotRegistered` and FCM
  responses returning `messaging/(invalid-registration-token|registration-token-not-registered)`
  are removed via `arrayRemove` on the user doc. Admin SDK writes bypass rules, so this is
  safe to do server-side.
- **Service Worker config duplication is deliberate.** `firebase-messaging-sw.js` can't read
  `import.meta.env` — it runs outside Vite — so the Firebase config is duplicated inline.
  Documented in the file itself; production deploys must edit it (or a build step can
  generate it from `.env`; deferred).
- **Admin discovery needs a Firestore mirror.** Rules use the `role:'admin'` custom claim,
  but Functions can't query users by claim — only by Firestore field. `set-admin-claim.ts`
  now writes BOTH the claim AND `users/{uid}.role = 'admin'` (admin SDK bypasses rules). The
  claim remains the source of truth for rules; the doc field is for `sendToAdmins()` queries.
- **Push UX is opt-in per device.** A `notifications` slice (`enabled`, `expoToken`,
  `fcmToken`) is persisted alongside cart + ui. Registration only happens when
  `enabled && authenticated && no cached token`; opt-out un-registers the token and clears
  the cache. The local "test notification" button uses the OS API directly
  (`Notifications.scheduleNotificationAsync` / `new Notification(...)`), so it verifies the
  UI + handler without Functions deployed.
- **Localized push copy.** Functions read `users/{uid}.language` (default `'uz'`) and pick
  the right title/body from an inline `COPY` table. The apps mirror `uiSlice.language` to the
  user doc on first auth after a language change so server-side copy follows the user's UI
  choice.
- **EAS dev build requirement (mobile).** `getExpoPushTokenAsync` doesn't work in Expo Go;
  `apps/mobile/eas.json` defines a `development` profile. The setup steps are in the README;
  no store submission this phase. iOS dev builds need a paid Apple Developer account —
  documented so the user can skip iOS and test on Android only if needed.

## Polish, web deploy & legal (Phase 8a)

- **Audience policy is adult-buyers (parents).** KidsWear sells children's clothing but the
  service is intended for users 18+. This framing runs through the privacy + terms copy,
  the in-app wording, and (next phase) the Play Store listing — explicitly to stay OUT of
  Google Play's Families program (which would impose COPPA-style child-app rules we don't
  need to comply with because we don't market to children or knowingly collect their data).
- **Brand assets are placeholders generated from one SVG.** `assets/source/kidswear-mark.svg`
  → `scripts/generate-brand-assets.mjs` (sharp, root devDep) produces all PNGs: mobile
  `icon`/`adaptive-icon`/`notification-icon`/`splash-icon`/`favicon`, web `favicon-32` /
  `favicon.ico` / `apple-touch-icon-180` / `maskable-192/512` / `og-image`, plus the
  `manifest.webmanifest`. The script is idempotent so re-running on a designer's SVG drop-in
  produces fresh assets without code changes.
- **Legal content lives in a shared package.** `@kidswear/legal` exports `getLegalDoc(kind,
  locale)` returning the markdown string. Files are `.ts` template literals (not `.md`) so
  the package works under both Vite and Metro without bundler-specific raw-import plugins.
  Both web (`/privacy`, `/terms`) and mobile (in-app screens reachable from Profile) read
  from the same source — single source of truth.
- **Legal copy is grounded in the actual data flow** — no boilerplate clauses for features
  we don't ship (no analytics, no advertising IDs, no payment-card processing because the
  deposit is a stub). The third-party list is just Google Firebase + Expo Push Service with
  links to their privacy policies. Contact email is flagged as a placeholder for real launch.
- **SEO is meta-tag-level only this phase** — `index.html` head with OpenGraph + Twitter
  Card, a `useDocumentTitle` hook for per-page titles, a static `sitemap.xml` (`/`,
  `/catalog`, `/privacy`, `/terms`) with a comment flagging per-product entries as a future
  improvement, and a permissive `robots.txt`. No `react-helmet`/SSR overhead — the small
  hook is enough for a CSR SPA.
- **Netlify monorepo strategy: `base = apps/web`.** Netlify cd's into the web app and runs
  its `npm run build` directly, bypassing the root Turborepo pipeline at deploy time. That's
  intentional — only the web app is hosted on Netlify; mobile (EAS) and Functions (Firebase)
  ship elsewhere. SPA fallback redirect, no-cache for the FCM Service Worker (`/firebase-
  messaging-sw.js`), and `immutable` cache for Vite's fingerprinted `/assets/*`.
- **No production Android build or Play submission yet.** That's Phase 8b — and it needs the
  live privacy-policy URL produced by this phase's Netlify deploy.

## Dual hosting: Netlify + Firebase Hosting (Phase 8a addendum)

- **Both are configured; pick one per deploy.** `netlify.toml` and the `"hosting"` block in
  `firebase.json` produce the same artifact (`apps/web/dist`), with the same SPA rewrite,
  the same `no-cache` for the FCM Service Worker, and the same `immutable` cache for
  fingerprinted `/assets/*`. Switching providers is a one-line CLI change, not a code change.
- **Firebase Hosting unifies the stack.** The rest of the backend (Auth, Firestore, Storage,
  Functions, FCM) already runs on Firebase; hosting the web app there means one console,
  one billing line, and — crucially — the hosting domain (`*.web.app` /
  `*.firebaseapp.com`) is **auto-authorized for Firebase Auth**, so no manual entry in the
  Authorized-domains list is required for the popular default URL.
- **Netlify stays as the fallback** for deploy previews per PR and as a quick A/B target if
  Firebase Hosting hits a quota or limit. The two configs do not conflict; they're just two
  ways of taking the same `dist` to a public URL.

## UI overhaul + Google Sign-In (Phase 10)

- **Kept MUI (web) + Paper (mobile).** Switching UI libraries mid-project would have been a rewrite risk with no user-facing win. Instead: tightened `@kidswear/theme` and let the tokens ripple through every adapter and component. Result: same libraries, materially better perceived quality.
- **Design tokens grew four new axes.** `tokens.durations` (fast/normal/slow) + `tokens.easings` (Material curves) give consistent motion; `tokens.elevations.{sm,md,lg,xl}.shadow` replace ad-hoc box-shadows; typography gains `fontSizes.5xl/display`, `fontWeights.extrabold`, and `letterSpacings.{tighter, tight, wide}` so headlines can breathe; spacing scales to `2xs..6xl` for hero and empty-state padding. Both adapters (`muiTheme.ts`, `paperTheme.ts`) pull from these — components stay clean.
- **MUI adapter is now opinionated.** Pill buttons (`borderRadius: radii.full`), blurred transparent `AppBar` (`backdropFilter: 'saturate(180%) blur(12px)'`), refined H1/H2 with negative letter-spacing and near-1.0 line-height, `body` at 1.6 line-height, full-radius `Chip`, large outlined `TextField` — all default styling comes from the theme so pages don't hand-roll.
- **Global chrome mobile-first responsive.** `PublicLayout` sticky `AppBar` has a two-state design (transparent at top, blurred surface after `scrollY > 8`), collapsing into a hamburger + `MobileNavDrawer` under `md`. `AdminLayout` shows a persistent sidebar on desktop and a fixed `BottomNavigation` on mobile — no dead space, no broken layouts at 360/768/1024/1440.
- **Google Sign-In wired platform-agnostically through `@kidswear/firebase`.** New `signInWithGoogleCredential(credential)` takes any `AuthCredential`, calls `signInWithCredential`, and `upsertUserProfile` so first-time federated logins land as `role: 'customer'` — the profile row admins can find via `sendToAdmins`. `useAuthActions` exposes `loginWithGoogleCredential(credential)`; the PROVIDER-specific dance (popup on web, `expo-auth-session` on mobile) stays in each app's `lib/googleSignIn.ts`. `AuthCredential` is imported directly from `firebase/auth` at each callsite — not re-exported through `@kidswear/auth` — because both apps already depend on `firebase` and pushing the type through the shared layer would leak Firebase types into an otherwise Firebase-agnostic contract.
- **`mapAuthError` now covers popup edge cases.** `auth/popup-closed-by-user`, `cancelled-popup-request`, `popup-blocked`, and `account-exists-with-different-credential` map to dedicated `auth.errors.*` keys so users get clear localized copy instead of the "generic" fallback.
- **Mobile Google Sign-In needs the EAS dev build.** `Google.useAuthRequest` compiles fine in Expo Go but won't return a real id_token there — the same constraint that already applies to biometric AppLock and push (Phase 3/7). Documented in the mobile `googleSignIn.ts` and README's setup section.
- **Wishlist / favorites deferred.** Explicit product decision — the user mentioned it but it's a separate feature (new Firestore collection, new hooks, new UI). Not part of "polish"; can be picked up as its own phase.

## Expo → bare React Native CLI migration

- **Why**: full ownership of the native projects (no EAS dependency, no Expo Go
  constraints); Play-Store builds run straight through `./gradlew` on any machine with the
  Android SDK. Requested explicitly after Phase 10.
- **What stays**: React Native 0.85.3 (the same core Expo SDK 56 wrapped), React Native
  Paper + NativeWind, the entire shared package layer, the Firebase **JS SDK** for
  auth/firestore/storage. What changes is the shell around them.
- **Navigation**: Expo Router (file-based `app/`) → **React Navigation v7** with typed
  param lists (`RootStackParamList`), a bottom-tab navigator for the four public tabs and
  native-stack screens for everything else. Push-tap deep links go through a
  `navigationRef` so `attachNotificationListeners` can navigate outside the tree.
- **Push**: Expo Push Service dropped on mobile — **FCM only, both platforms** via
  `@react-native-firebase/messaging` (+ `@notifee/react-native` for foreground display,
  channels, and the local test notification). `pushTokens` now has a single `fcm` array;
  the legacy `expo` key was dropped from the schema. Zod strips unknown keys, so profiles
  written before the migration keep a stale `expo` array that is simply never read — no
  migration script needed.
- **Module swaps** (signature-preserving so components didn't change):
  image-picker/manipulator → `react-native-image-picker` + `@bam.tech/react-native-image-
  resizer` (WEBP on Android; JPEG fallback on iOS — Android-only delivery, documented);
  secure-store → `react-native-keychain`; local-authentication →
  `react-native-biometrics`; localization → `react-native-localize`; auth-session →
  `@react-native-google-signin/google-signin` (needs SHA-1 in Firebase Console);
  `@expo/vector-icons` → `react-native-vector-icons` (fonts bundled via fonts.gradle).
- **Env inlining**: bare RN has no `EXPO_PUBLIC_*` magic. `babel.config.js` loads
  `apps/mobile/.env` via dotenv and `babel-plugin-transform-inline-environment-variables`
  bakes the values into the bundle. Variables are named **`RN_PUBLIC_*`** — the Expo prefix
  was kept briefly during the port, then renamed so nothing implies an Expo runtime. The
  plugin runs with an explicit `include` allowlist: without one it substitutes *every*
  `process.env` read, which would bake unrelated host/CI values into the shipped bundle.
- **Android project**: generated from `@react-native-community/template@0.85.3` and
  adapted for the monorepo (gradle plugin + react{} paths point at the hoisted root
  `node_modules`). `google-services.json` is NOT committed; the google-services gradle
  plugin ships commented-out so the first build succeeds without it — enabling push =
  drop the json in `android/app/` and uncomment one line.
- **Verification limits**: this environment has no Android SDK, so the CI-able gate is
  now `tsc + eslint + react-native bundle` (Metro production bundle). The first
  `./gradlew assembleDebug` must run on a developer machine — called out in the README.

### Follow-up: Expo naming cleanup

Renames and corrections after the port settled. Behavior is unchanged except where noted.

- `EXPO_PUBLIC_*` → `RN_PUBLIC_*` across `.env.example`, babel, `src/firebase.ts`,
  `src/lib/googleSignIn.ts`, and the README. `.env.example` also dropped the unused
  `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` entries: native sign-in only needs
  the Web client id, and reads the Android client from `google-services.json`.
- `pushTokens.expo` removed from the schema, from `addPushToken`/`removePushToken`
  (now typed `PushChannel = 'fcm'`), and from the privacy policies, which had listed
  **Expo Push Service** as a third-party processor — inaccurate once FCM became the only
  channel, and a legal document is the wrong place to leave that stale.
- Redux `notifications.expoToken` / `setExpoPushToken` deleted — dead since the mobile app
  switched to `fcmToken`. Installs that persisted the old key keep it as inert data.
- README said the AppLock flag lives in "SecureStore". It never did after the port —
  it is `react-native-keychain` under service `kidswear.applock`. Corrected.
- `ProductCard` still imported `useRouter` from `expo-router`. It resolved only because
  `expo-router` was reachable transitively through `@react-native-firebase/app`'s
  dependency on `expo`, so the bundle built and hid the bug. Now on `useNavigation`.

**Cloud Functions were never actually buildable** — two independent faults, both fixed here:

- `functions/.gitignore` had a bare `lib/`. Gitignore patterns without a leading slash
  match at any depth, so it also matched `functions/src/lib/`, and `admin.ts`, `push.ts`,
  `i18n.ts` were silently never committed. The pattern is now `/lib/` (build output only)
  and the three modules are restored, with the fan-out rewritten FCM-only: it reads
  `pushTokens.fcm`, sends via `sendEachForMulticast`, and prunes tokens FCM reports as
  permanently unregistered.
- `firebase-admin@^14` conflicted with `firebase-functions@^6`, whose peer range stops at
  admin 13 — `npm install` in `functions/` failed outright. Bumped to
  `firebase-functions@^7.3.0`, which accepts admin 14. `expo-server-sdk` dropped.

## Profit report & users on Spark (2026-10-25)

- **Cost lives in `productCosts/{productId}`, never on `products`.** Products are publicly
  readable (the catalog works signed out), and Firestore cannot hide a field of a readable
  document, so any cost on a product would leak. The cost document holds `cost` (product
  default) and `variants` (variant id → cost; same ids as `Product.variants`, `default` for a
  legacy product). `unitCostFor` = variant value, else the default, else **`null`** — a missing
  cost is never read as 0. Rules: admin read; admin write with the shape pinned (`cost` a
  non-negative int, `variants` a map, `updatedBy == auth.uid`, `updatedAt == request.time`);
  nobody else can `get`, `list` or collection-group query it. Purging a product deletes its
  cost document in the same batch.
- **CSV carries no cost at all.** Considered: an extra admin-only column. Rejected — a CSV file
  leaves the admin panel (email, Telegram, a shared drive), and the same file is the import
  format, so a cost column would invite costs into product rows. Costs are entered per product
  in the web admin ("Tannarx" button on the products list). `CATALOG_CSV_COLUMNS` is unchanged.
- **`orderCosts/{orderId}`: an immutable snapshot taken at confirmation.** `changeOrderStatus`
  (the Faza 3 stock transaction) also reads the snapshot slot whenever the next status is a
  confirmed one (`STOCK_HOLDING_STATUSES`); if it is empty it reads the products' cost documents
  and writes `{lines[{productId, variantId, quantity, price, unitCost|null}], totalCost,
  missingLines, by, createdAt}` together with the stock change. Create-once is the
  idempotency: a double click, cancel → re-confirm, or processing → shipped finds it and writes
  nothing; rules forbid update and delete, so a later cost edit never rewrites past profit.
  Taking it on *every* entry to a confirmed status (not only when stock moves) covers Blaze,
  where `onOrderCreate` takes the stock first. Legacy lines without `variantId` resolve against
  the product read in the same transaction.
- **Old orders: an explicit, marked backfill.** Orders confirmed before this phase have no
  snapshot. The report offers "Eski buyurtmalarga hozirgi tannarxni yozish (N)": one transaction
  per order writes a snapshot from *today's* costs with `backfilled: true` (the rules allow only
  `true`). It is a deliberate admin action because it is an approximation.
- **Profit maths (`summarizeProfit`, pure, `@kidswear/data`).** Counted: confirmed orders
  (`processing`/`shipped`/`delivered`) by creation time in a Tashkent-day period (presets: this
  month, 30 days, 12 months, all; or any from–to). Revenue = Σ `total`; goods revenue = `total −
  deliveryFee` (after discount); profit = goods revenue − `totalCost`, only over orders whose
  snapshot is complete (`missingLines == 0`). Orders without a complete snapshot stay in revenue
  but are counted and shown as "tannarxsiz" instead of silently inflating profit. Delivery fees
  are not profit on goods. Per-month table inside the period.
- **Users list = client join (Spark).** `getAllUsers` reads every profile (each validated on its
  own, so one malformed profile is skipped, not fatal) and `summarizeCustomers` joins them with
  the admin's live order list: order count (cancelled excluded), total spent (Σ `total` of paid
  orders — the same statuses as the sales report), last order. Orders whose profile is missing
  still get a row (named from the shipping address). Search (name/email, phone only for a
  phone-like term), sort and paging (25/50/100) are in memory. Fine for a small shop; at scale
  it needs server counters (Functions).
- **Mobile:** the reports screen shows the profit card (read-only, presets). Entering costs, the
  backfill and the users list are web-only.
- **Known limits:** profit uses the order-level discount implicitly (goods revenue is after
  discount), so there is no per-product profit table — splitting a discount across lines would
  be a guess. `orderCosts` read is admin-wide (one `getDocs` of the whole collection), like the
  orders list.

## Tests & CI

- **One root Vitest config with three projects, not a config per package.** Ten near-identical
  configs would drift; a single `vitest.config.ts` with `projects` keeps environment
  differences (node vs jsdom) explicit in one file. Workspace aliases point at `src/index.ts`
  so tests exercise the same entrypoints the apps import — no build step in the test path.
- **The `rules` project is conditional on `FIRESTORE_EMULATOR_HOST`.** `firebase
  emulators:exec` sets that variable, so the project registers itself only when an emulator
  is actually up. A bare `npm test` therefore stays green instead of failing with a
  connection error, while `npm run test:rules` runs the full set.
- **Web components render through the real providers.** `renderWithProviders` wires the
  actual store (`makeStore` with in-memory persist storage), i18n instance and theme rather
  than mocking them, so a broken provider contract fails a test instead of passing against
  a mock. In-memory storage keeps redux-persist from leaking state between files.
- **Assertions avoid Intl glyphs.** `Intl.NumberFormat` emits locale- and ICU-version-specific
  separators (often NBSP). Price tests compare extracted digits and structural properties
  instead, so an ICU upgrade in CI does not turn the suite red.
- **Fixtures are fully typed, with no `as` casts.** `packages/data/src/testFixtures.ts`
  exports `makeProduct`/`makeOrder` builders. The first draft used `as Product` on partial
  objects, which compiled while silently diverging from the schema (`Date` where the model
  says epoch millis, four missing fields). Requiring complete fixtures makes schema drift a
  compile error.

**Two real defects surfaced while writing these tests, both fixed:**

- `pickLocalized` fell back only on `null`/`undefined`, but the admin forms default `en`/`ru`
  to `''` and submit them as-is. A category saved without an English name rendered a blank
  label for English users. Blank now counts as missing.
- `slugify`'s transliteration map held only the Uzbek-specific Cyrillic letters. Since every
  unmapped letter is not `[a-z0-9]`, it collapsed to a dash and got trimmed — `"шапка"`
  slugged to `"sh"`, and a fully-Cyrillic name could slug to the empty string. Uzbek is
  routinely written in Cyrillic and the slug feeds `name.uz`, so the map now covers the full
  alphabet.

- **CI is three parallel jobs** (`.github/workflows/ci.yml`): the monorepo verify job
  (type-check, lint, tests, web build, **Metro production bundle**), a Cloud Functions job
  (its own install/type-check/lint/build, since it is a separate workspace), and a rules job
  with a JDK for the emulator. The Metro bundle step is deliberate: it is the only gate that
  catches bad module aliases and unresolvable native modules, which tsc and eslint cannot see
  — exactly the class of bug that let an `expo-router` import survive the migration.

## Payments: Payme + Click (real gateways)

- **The client never declares itself paid.** This is the whole architectural
  change from the stub. Previously checkout ran the (mock) payment first and then
  created the order already `deposit_paid` — fine for a stub that cannot lie, but
  fatal with a real gateway, since anyone able to write an order could claim a
  payment that never happened. Hosted gateways now get: create `pending` with
  `paidAmount: 0` → redirect → the provider calls our Cloud Function → the
  function flips the order with admin credentials.
- **Firestore rules enforce it rather than trusting the client code.** The create
  rule allows a `deposit_paid` order only when `payment.provider == 'mock'`. A
  client POSTing itself a `deposit_paid` order with `provider: 'payme'` is
  rejected server-side, and there is a rules test for exactly that.
- **The old create-in-final-state path is kept for `mock`.** It is what makes the
  app runnable with no merchant contract, and what keeps tests offline. Both
  paths still end in a single client create — the rules never permit a client
  order update, so create-then-update remains impossible.
- **No polling after the redirect.** The orders screens are already Firestore
  snapshot listeners, so the status flip arrives on its own. The mobile app
  navigates to Orders after handing off to the browser, rather than to a success
  screen that would be lying at that moment.
- **Confirmation is idempotent and transactional.** Both gateways retry
  callbacks; `confirmDeposit` re-reads the order inside a transaction and returns
  `already-confirmed` instead of writing again, so two concurrent retries cannot
  both pass the check. Each provider maps that outcome to the response its
  protocol expects — Payme repeats the success payload, Click returns its
  `AlreadyPaid` code.
- **Errors go in the response body, never as HTTP status codes.** Both providers
  treat a non-200 as a transport failure and retry indefinitely. Payme gets
  JSON-RPC error objects with its documented negative codes; Click gets its
  `error`/`error_note` fields. The webhook returns 200 even for "unauthorized".
- **Amount units are the highest-risk detail.** Payme bills in tiyin (×100),
  Click in som. Sending som to Payme would undercharge by 100×, so the
  conversion is a named function with tests asserting the unit on both sides.
- **Click's signature differs between Prepare and Complete** — the
  `merchant_prepare_id` slot participates only in Complete. A single naive
  concatenation would reject every Complete callback, so the builder branches on
  the action and both variants are tested, including a replay of a Prepare
  signature as Complete.
- **`base64Encode` is hand-rolled.** Payme's checkout URL is a base64 payload,
  and neither `Buffer` (Node-only) nor `btoa` (missing from some Hermes builds,
  and byte-oriented) is safe in a package shared by web and React Native.
  Encoding the UTF-8 bytes directly keeps output identical on both platforms —
  verified against the platform encoder for ASCII and round-tripped for Cyrillic.
- **Secrets stay server-side.** Merchant and service ids are public and live in
  each app's env; `PAYME_MERCHANT_KEY` and `CLICK_SECRET_KEY` are Cloud Functions
  secrets and never enter a bundle. A provider whose ids are absent is simply not
  offered, so a deployment without a contract shows no broken option.
- **Not verified end-to-end.** Signature construction, amount conversion, error
  codes, auth parsing and idempotency are unit-tested, and the rules change has
  emulator coverage. No request has been made against a real Payme or Click
  sandbox from this environment — that has to happen before launch.

## Server-side catalog search, sort & pagination

Supersedes the Phase 4 "small-catalog decision" (search and sort in memory over the whole
collection). That was honest for a demo catalog and became the documented risk; this closes it.

- **Search is a denormalized prefix-token array, not a scan.** Firestore has no substring or
  full-text operator, so `buildSearchTokens` stores every word prefix of every localized name
  and `array-contains` matches one token. Cost is now independent of catalog size. The
  trade-off is explicit: word **prefixes** ("koy" → "koʻylak"), not infixes ("ylak" → nothing).
  Infix search needs a separate engine; prefixes are what shoppers type.
- **Apostrophes are normalized on both sides.** Uzbek is written with ʻ, ‘, ’, ' and ` more or
  less interchangeably, and nobody types the right one. Both the stored tokens and the query
  strip them, so "ko'ylak", "koʻylak" and "koylak" are the same search.
- **Only the longest query word is used.** `array-contains` takes a single value, so the most
  selective word wins; the rest would need `array-contains-any` (an OR, which is wider, not
  narrower) or client-side re-filtering.
- **Prefixes are capped at 12 characters and start at 2.** One-letter prefixes match most of
  the catalog and are useless as a filter; uncapped prefixes bloat the document on long names.
  A query longer than the cap is truncated to match what was actually stored.
- **Keyset pagination, not offsets.** `startAfter(lastDoc)` rather than an offset: Firestore
  bills for documents an offset skips, and offsets drift when rows are inserted between page
  loads. Price sorts carry a `createdAt` tie-break so equal prices cannot skip or repeat rows
  across a page boundary.
- **`searchTokens` is optional in the schema, and the mutations maintain it.** Products
  predating this have none and are invisible to search until `scripts/backfill-search-tokens.ts`
  runs — they stay browsable by category, so the failure mode is degraded, not broken. Any edit
  touching a name rebuilds the array (re-reading fields the patch does not carry), because a
  stale token array silently makes a product unfindable.
- **`useProducts` moved to `useInfiniteQuery` and its return type changed.** Search and sort are
  now part of the query key — they are server queries and must refetch, where before they were
  deliberately excluded as client-only. Callers get `products` plus `hasNextPage` /
  `fetchNextPage`; web renders a "load more" button, mobile uses `onEndReached`.
- **`catalogFilter.ts` was deleted rather than left in place.** Its client-side search/sort had
  no callers once the server took over, and a tested module that nothing imports reads as live
  code. The admin products page keeps its own in-memory filter — it deliberately loads all
  products, including inactive ones, for a much smaller audience.
- **Eleven composite indexes** cover the category × search × sort combinations. They must be
  deployed (`firebase deploy --only firestore:indexes`) before the queries work; Firestore
  fails such a query with a console link rather than returning partial results.

## Local emulator preview

- **`initFirebase` takes an optional `emulators` option.** Both apps can point the SDK at local
  Firestore/Auth/Storage emulators, which makes the app runnable with seeded data and no cloud
  credentials — and removes any chance a dev session writes to production.
- **`scripts/seed-emulator.mjs` talks to the emulator REST API**, not the Admin SDK, so it needs
  no service-account key and runs anywhere the emulator does. It sends `Authorization: Bearer
  owner`, the emulator's superuser token, because seeding is an administrative act — the first
  attempt without it was correctly rejected by the rules, which was a useful signal that the
  rules are doing their job.

**This exercise found a bug that no automated gate could see.** `import storage from
'redux-persist/lib/storage'` resolved, under Vite 8's CommonJS interop, to the module *exports
object* (`{ __esModule: true, default: engine }`) instead of the engine. `makeStore` then threw
inside `StoreProvider`, React unmounted the tree, and the app rendered a blank page. `tsc`,
`eslint` and `vite build` all passed — the types are structurally compatible and the failure is
purely at runtime. It surfaced within seconds of actually loading the page.

The fix (`apps/web/src/app/webStorage.ts`) unwraps the interop, throws a diagnostic error rather
than a cryptic one if the shape changes again, and is covered by a regression test. The lesson is
recorded here because it argues for something the CI does not yet do: **load the app and assert it
renders**. A smoke test driving a real browser would have caught this on the commit that
introduced it.

## Mobile: one React in the bundle (APK v1.0.7 crash)

APK v1.0.7 closed on launch with `TypeError: Cannot read property 'useState' of null` in
`StoreProvider`. The mobile app pins `react@19.2.3` — the version react-native 0.85.3's renderer
is built against — so npm installs it in `apps/mobile/node_modules`, while the web app's
`react@19.2.7` is hoisted to the root. Metro resolved `react` per importing file: app code got the
pinned copy, hoisted packages (react-native's renderer, react-redux, redux-persist) got the root
copy. The renderer installed its hook dispatcher on one React and `StoreProvider` read it from the
other — `null`. `tsc`, `eslint` and the Metro bundle step all passed.

- **Fix:** `apps/mobile/metro.config.js` resolves every `react` / `react/*` import from the app
  itself, so the bundle has exactly the renderer's React.
- **Guard:** `scripts/check-single-react.mjs` reads the bundle's source map and fails CI unless
  exactly one `node_modules/react` is in it (`npm run check:single-react` in `apps/mobile`).

## Mobile: icon fonts in a hoisted monorepo (APK v1.0.8)

Every icon in APK v1.0.8 rendered as a box: `react-native-vector-icons/fonts.gradle` copies fonts
from `<app>/node_modules`, which is empty here because npm hoists deps to the root, and a Copy
task with no matching files succeeds silently. `vectoricons.iconFontsDir` now points at the root
`node_modules`, and the APK workflow fails unless `assets/fonts/MaterialCommunityIcons.ttf` is in
the APK.

## Product variants (2026-10-22)

- **Stock (and optionally price) live per size × colour.** `Product.variants?: {id, size, color,
stock, price?, sku?}[]`, built as the cartesian product of `sizes × colors` minus
  `variantsExcluded` (ids the admin removed, kept so a later axis edit does not resurrect them).
  `id = variantIdFor(size, color)` is deterministic (URI-encoded `size|color`). An empty axis
  contributes one `''` value. Helpers live in `@kidswear/core/variant.ts` (pure, tested).
- **Product `stock` stays, as the variants' sum.** The admin mutations (`createProduct` /
  `updateProduct`) recompute it on every write that carries variants, so catalog `StockBadge`,
  low-stock dashboard and the server-side sort keep reading one field.
- **No data migration.** A product without `variants` is "legacy": `productVariants()` yields one
  synthetic `default` variant from its `stock`/`price`, its size/colour lists stay descriptive,
  and every pick sells from the shared stock. Opening such a product in the admin form builds a
  zero-stock matrix (unless it is a single combination, which inherits the stock) and shows a
  notice — splitting shared stock is the admin's decision, never guessed. Hence no backfill script.
- **Cart/order lines carry optional `variantId`.** Line identity is unchanged, so redux-persist
  carts from before variants keep working; re-adding the same pick upgrades the old line.
  Checkout re-checks stock per variant (`stockCoversLines`, lines summed per variant so legacy
  lines in several sizes cannot oversell the shared stock).
- **Rules unchanged in behaviour.** Product writes stay admin-only (variants included); order
  money checks (`promoOk`, `deliveryOk`, `totalsOk`) are untouched. Line prices — now possibly a
  variant's own — remain client-supplied until Cloud Functions can reprice.
- **Dormant Functions follow along.** `onOrderCreate` (Blaze-only) decrements the ordered variant
  and rewrites `stock` as the sum (`functions/src/lib/stock.ts`), so turning Functions on later
  does not desync the two.

## Inventory on Spark (2026-10-22)

- **Stock moves when the admin confirms, inside a client transaction.** Without Cloud Functions
  nothing trusted runs at order time, and a customer must never write product stock. So the
  admin client's `changeOrderStatus` (`@kidswear/firebase/inventory.ts`) is the stock writer: one
  `runTransaction` reads the order and its products, updates each product's `variants`/`stock`,
  appends `stockMoves` rows and writes the new status. A shortfall throws `InventoryError` before
  any write, so the status stays put.
- **"Confirmed" = `processing`, `shipped` or `delivered`** (`STOCK_HOLDING_STATUSES`). `processing`
  is the first status after `deposit_paid` that the admin sets, but jumping straight to
  `shipped`/`delivered` also takes the stock, so it cannot be skipped by accident. Leaving those
  statuses (cancel, or back to `pending`/`deposit_paid`) returns it. `stockActionFor(current,
  next, stockApplied)` is the pure rule; re-saving the current status never moves stock.
- **`orders.stockApplied` is the idempotency flag, shared with Blaze.** Read inside the
  transaction, set by whoever takes the stock, cleared on return. `onOrderCreate` now reads it
  in its own transaction, sets it and journals `by: 'system'`, so turning Functions on later
  cannot double-decrement an order the admin already confirmed (or vice versa). Clients may not
  create an order carrying `stockApplied`/`cancelReason`.
- **Reserve-at-confirm, not at checkout.** Two customers can both order the last unit; the
  second confirmation fails with a clear message. Reserving at checkout would need a client
  write to products (unsafe) or Functions. Revisit in Faza 14.
- **`stockMoves` is append-only and admin-only** (rules: shape-checked create with
  `by == auth.uid`, `createdAt == request.time`, `delta` a non-zero int; no update/delete). The
  rules do not tie a product write to a journal row — admins are trusted; the journal is an
  audit aid, not a security boundary.
- **Manual moves** (`adjustStock`): intake (+n), write-off (−n), stocktake (counted − recorded).
  Same transaction pattern; a zero stocktake difference writes nothing. Pure maths in
  `@kidswear/core/inventory.ts` (`applyVariantDeltas`, `orderLinesStockChange`,
  `manualStockDelta`), legacy products move their single `stock` via the synthetic `default`
  variant and never gain a `variants` field.
- **Customer cancel is `pending`-only** (was `pending`/`deposit_paid`): once money is in, a
  refund is the shop's decision. Rule: owner, `pending → cancelled`, `cancelReason == 'customer'`,
  affected keys ⊆ {status, cancelReason, updatedAt}. A pending order never holds stock, so there
  is nothing to return.
- **Minimum order** lives in `settings/delivery.minOrder` (optional, measured after discount,
  like `freeFrom`). Checked by `useCheckout` and by `minOrderOk` in the rules next to
  `totalsOk`; the rules read the same document as `deliveryOk`, which the per-request cache
  serves once.
- **Converter reads pending server timestamps as estimates.** A latency-compensated snapshot
  of a doc just written with `serverTimestamp()` has the field as `null`, which failed schema
  validation inside `onSnapshot`. `serverTimestamps: 'estimate'` fixes it for every collection.

## Card transfer + receipts on Spark (2026-10-22)

- **Manual card transfer is a payment provider (`transfer`), not a gateway.** The order is
  created `pending` / `paidAmount: 0` like a hosted gateway, but instead of a webhook an admin
  approves an uploaded receipt. The client still never declares itself paid: the orders create
  rule keeps `deposit_paid` for `mock` only, and additionally refuses `transfer` orders unless
  `settings/payment.transferEnabled` is true.
- **`settings/payment` is public and display-only.** The card number must be readable by every
  customer, so it lives in the existing public `settings/*` documents (admin write). Digits are
  stored, formatting is a pure function (`formatCardNumber`). The seed uses an all-zero fake
  card; a real card is entered in the admin panel, never committed.
- **Receipts are compressed JPEGs in Firestore** (`receipts/{id}`), the same Spark workaround
  and byte budget as `productImages` (≤420 000 chars, `data:image/jpeg;base64` only). No PDF
  until Storage exists. Unlike product photos they are private: owner and admins read.
- **The 5-receipt cap is enforced by slot ids, not a counter.** Ids are `{orderId}_r1…_r5`;
  the rules accept only those ids, and a `setDoc` over an existing doc is an update, which the
  customer may not do. So the cap holds with no field on the order — a counter the customer
  would have to maintain (and could forge) is avoided, and the customer gets no order write
  permission at all. Rejected receipts keep their slot (audit trail; nothing is deleted).
- **Approval is one client transaction (`reviewReceipt`).** It re-reads the receipt (must be
  `pending`) and the order (must be `pending`, `transfer`, and `stockActionFor(pending →
  deposit_paid)` must be `none`), then writes receipt `approved` + order `deposit_paid`,
  `paidAmount = depositAmount`, `payment.state = 'paid'`, `payment.transactionId = receiptId`.
  A double click finds the receipt already reviewed and writes nothing. Stock is untouched,
  consistent with Inventory on Spark: it moves when the admin confirms (`processing`).
- **Admin review is a one-way, field-limited update.** Rules allow only `status`
  (approved/rejected), `reviewedBy == auth.uid`, `reviewedAt == request.time` and `note`, and
  only while the receipt is `pending`. Rejection requires a note (UI + `ReceiptError`), which
  the customer sees live; they then upload into the next free slot.
- **Customers query receipts with `userId == uid`.** A query by `orderId` alone cannot be
  proven to return only their documents, so the rules would refuse it; admins query by
  `orderId` only. Both are equality-only, so no composite index is needed.
- **Mobile copy uses Share, not a clipboard package.** React Native no longer ships a
  clipboard; adding a native module for one button was not worth an untested APK change. The
  number is selectable and Share opens the system sheet (which has Copy on Android).

## Reviews on Spark (2026-10-22)

- **`reviews/{orderId}_{productId}`, one review per product per order.** The deterministic id
  is checked by the rules (`reviewId == orderId + '_' + productId`); a second write to the same
  id is an update, which a customer may only do to `rating`/`text`, so a duplicate review (or
  overwriting `createdAt`/`status`) is refused. A product bought in two sizes on one order gets
  one review; buying it again in a later order allows another.
- **Purchase check reads the order's real `items`, no `productIds` field.** The rules language
  has no loops, but list indexing works, so `orderHasProduct` checks lines 0…19 one by one
  (`items.size() > i && items[i].productId == pid`). Considered alternative: a client-written
  `productIds` array on the order checked with `in`. Rejected because the rules could not tie
  it to `items` either — a customer could list a product they never bought, have the cheap
  order delivered and review the expensive one — and old orders would need a backfill. With the
  unrolled check **every existing order works as is**, nothing to migrate. Cost: only the first
  `REVIEWABLE_LINES_MAX = 20` lines are reviewable (the UI hides the button beyond that,
  `reviewableProductIds`). The `get()` of the order is one billed read (repeat `get`s of the
  same path are cached within a request).
- **Create rule:** signed in, `userId == auth.uid`, the order exists, belongs to the caller and
  is `delivered`, the product is on it; exact key set; `rating` int 1–5; `text` ≤1000;
  `authorName` 1–60; `status == 'visible'`; no `featured`; both timestamps `== request.time`.
- **Read:** `visible` for everyone, `hidden` only for the author and admins. Public queries
  must filter `status == 'visible'`; the order page queries `orderId + userId` (so the author
  sees a hidden review's notice).
- **Author edits `rating`/`text` for 7 days** (`request.time < createdAt + 7d`,
  `REVIEW_EDIT_WINDOW_MS`, `canEditReview`). Admins change only `status`/`featured`
  (+`updatedAt`) — they moderate, they never rewrite a customer's words — and only they
  delete. Nobody else deletes.
- **`products.rating`/`reviewCount` stay admin-write; the admin client recounts them.** A
  customer cannot write products, and Spark has no trigger, so a new review does **not** change
  the stored rating until an admin acts. `moderateReview` (show/hide/feature/delete) reads the
  product's reviews, then in one `runTransaction` writes the review change and the product's
  `summarizeReviews` (mean of visible stars, one decimal) with that change applied. A client
  transaction cannot run a query, so a review posted between that read and the commit is picked
  up by the next moderation or by **"Reytinglarni qayta hisoblash"** (`recomputeAllRatings`:
  every product, batched, only changed ones written; products without reviews get 0/0). Owner
  edits of stars also wait for the next moderation/recount.
- **No second average on the product page.** The page shows the stored `rating`/`reviewCount`
  (same number as anywhere else) and lists visible reviews under it. Averaging the loaded page
  would disagree with the stored value and with itself as pages load; the difference
  (unmoderated new reviews) is closed by the admin. Seed products' fake ratings were replaced
  by values recomputed from the seeded reviews.
- **"Mijozlar fikri"** = `featured == true && status == 'visible'`, newest 6. Featuring a hidden
  review is allowed (it simply does not show). Composite indexes for the three review queries
  are in `firestore.indexes.json` (the emulator does not enforce them).
- **Author name is shortened on the client** ("Ali Valiyev" → "Ali V.", `authorDisplayName`) and
  stored; it is customer-supplied text like the review itself (length-checked only).
- Admin list loads the newest `ADMIN_REVIEWS_LIMIT = 200` (optionally by status); paging can come
  when volume needs it.

## Catalog admin on Spark (2026-10-25)

- **`isActive == true` stays the one storefront filter.** Firestore cannot query "field absent", so
  `isDraft`/`deletedAt` are optional fields (old products have neither) and the admin writes keep a
  draft or trashed product `isActive: false` (`enforceHiddenInvariant`, applied by `createProduct`,
  `updateProduct`, the bulk actions and `trashProduct`). An older form that sends `isActive: true`
  for a draft (the mobile one) is neutralised by one extra read in `updateProduct`. Storefront reads
  also re-check `isStorefrontVisible`, and `useProduct` returns `null` for a draft/trashed product.
- **Soft delete = `deletedAt` (epoch ms) + `isActive: false`.** "Delete" in the admin trashes;
  restore clears `deletedAt` and the product comes back **inactive** (the admin switches it on).
  Nothing purges automatically (no Functions on Spark): "Muddati oʻtganlarni tozalash" hard-deletes
  trashed products older than `TRASH_RETENTION_DAYS = 30`. Photos (`productImages`) of purged
  products are left behind — orphan cleanup stays with Phase 14.
- **Rules unchanged.** `products` is already admin-write, which covers the new fields and batches;
  one rules test pins that. Known limit: `products` stays publicly *readable*, so a draft or
  trashed product can still be fetched by anyone who knows its id through the raw Firestore API
  (the apps never list or open it). Tightening it to `isActive == true || isAdmin()` would also
  hide inactive products from direct links, which is a behaviour change left for the owner.
- **CSV = one row per variant** (`CATALOG_CSV_COLUMNS` in `@kidswear/core`). Rows group by
  `productId` (blank → by `name_uz`); product-level columns must agree across a product's rows.
  A lone row with empty size/colour and no variant price/sku keeps the legacy shape (no `variants`).
  Photos, ratings and status are not in the file. **Any error → nothing is imported** (errors list
  line numbers). Import only creates: ids that already exist are skipped, never overwritten.
  Imported products are `isActive: false`, no photos.
- **Excel**: the export carries a UTF-8 BOM; `.xlsx` is not supported, only CSV.
- **Mobile** (2026-10-29): `AdminProductsScreen` reuses the same `@kidswear/data` hooks as the web
  page — draft switch in the form, trash tab (restore / delete forever / purge expired), long-press
  multi-select with bulk hide / move / delete, and "hide without photos". Every destructive action
  goes through `ConfirmDialog`. No CSV on mobile. No new i18n keys (all `admin.catalog.*` existed).

## Search & filters (Phase 9, 2026-10-31)

- **Transliteration is part of normalization.** `normalizeSearchText` lowercases, maps Cyrillic to
  Uzbek Latin (ў қ ғ ҳ → o q g h; ъ ь dropped) and strips every apostrophe variant. It runs on both
  stored tokens and the query, so "куртка" finds "Kurtka" and vice versa. Stored tokens no longer
  contain Cyrillic, so **existing products must be recomputed once** — admin button "Recompute
  search tokens" (Spark has no Functions) or `scripts/backfill-search-tokens.ts`.
- **Filters are one shared hook.** `useProducts({ filters })` in `@kidswear/data`; web and mobile
  only render controls. Firestore takes category, gender (`in [g, 'unisex']`), ONE `array-contains`
  (search token, else size) and sort. Price range and age band are applied in memory by pure
  functions in `@kidswear/core/catalogFilter.ts` (two ranges / a second array-contains do not fit one
  query); when that leaves a page short the hook fetches more pages (max 8).
- **Product audience fields are optional.** `gender` and `ageFromMonths/ageToMonths` (months,
  unambiguous) are not backfilled; unknown is not "unisex", so such products drop out of gender/age
  filters until the admin fills them. Clearing a field in the admin form deletes it (`deleteField`).
- **24 new composite indexes** (category? × gender? × search/size array × 3 sorts), generated, in
  `firestore.indexes.json`; must be deployed. The emulator does not enforce indexes.
- **Category chips** hide categories without active products via count aggregations (1 read per
  1000 index entries), not by downloading products.
- **"Similar"** = `pickSimilar` scoring over the product's own category (same gender, close age,
  close price; newest breaks ties). Replaces the plain same-category row on web and mobile.

