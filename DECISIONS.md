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
