# KidsWear

A universal kids' clothing e-commerce platform — **React web** + **React Native (Expo)
mobile** in a single monorepo. Everything except UI is shared; the UI is implemented
separately per platform but driven by one shared design-token system, so both platforms
look like the same Material Design product.

> **Phase 7** — Cloud Functions + push notifications. A `/functions` workspace (outside the
> monorepo TS build) adds two Firestore triggers: `onOrderCreate` (transactional server-side
> stock decrement; auto-cancels and notifies the customer on out-of-stock; otherwise notifies
> admins) and `onOrderUpdate` (notifies the customer on status changes). Push fan-out goes
> through both the Expo Push Service (mobile) and FCM (web) with token cleanup on
> DeviceNotRegistered. Each app registers its own token after sign-in (gated by a per-device
> opt-in), the Profile screen has a Notifications section with a test button, and the user's
> active language is mirrored to Firestore so push copy is localized. Mobile needs an EAS
> dev build to receive real push (Expo Go can't); the test button works without it.

## Tech stack

| Concern       | Web (`apps/web`)                             | Mobile (`apps/mobile`)                       |
| ------------- | -------------------------------------------- | -------------------------------------------- |
| Framework     | Vite + React + TypeScript (strict)           | Expo SDK 56 + Expo Router + TS (strict)      |
| UI / Material | MUI + Tailwind v4 (CSS-first)                | React Native Paper (MD3) + NativeWind v4     |
| Routing       | react-router-dom (createBrowserRouter)       | Expo Router (file-based)                     |
| State         | Redux Toolkit + redux-persist (localStorage) | Redux Toolkit + redux-persist (AsyncStorage) |
| i18n          | react-i18next + browser detector             | react-i18next + expo-localization            |

### Shared packages

| Package              | Responsibility                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@kidswear/core`     | Domain model as Zod schemas; types inferred via `z.infer` (single source of truth)                                                                     |
| `@kidswear/firebase` | Platform-agnostic Firebase data layer: `initFirebase`, auth fns, typed Firestore converters/collections, data-access + storage helpers                 |
| `@kidswear/auth`     | Auth orchestration (react): zod schemas, `mapAuthError`, `useAuthActions` / `useAuthBootstrap` / `useAuth`                                             |
| `@kidswear/data`     | Server-state (TanStack Query) + real-time orders/admin: catalog hooks, `useCheckout`, order hooks, admin CRUD mutations + `useAllOrders` / `useUpdateOrderStatus`, `summarizeDashboard`, `PaymentService` stub |
| `@kidswear/store`    | Redux Toolkit slices (auth/cart/ui), `makeStore(storage)` factory, typed hooks                                                                         |
| `@kidswear/i18n`     | react-i18next config, `initI18n(detector)`, uz/en/ru locales                                                                                           |
| `@kidswear/theme`    | Pure-TS design tokens (colors, spacing, radii, typography)                                                                                             |
| `@kidswear/utils`    | `formatPrice` (UZS), `formatDate`, etc.                                                                                                                |
| `@kidswear/config`   | Shared ESLint (flat) + Prettier + base tsconfig                                                                                                        |

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

**Biometric AppLock (mobile only).** When enabled in Profile → Security, the mobile app
locks the already-signed-in session on cold launch and unlocks with Face ID / fingerprint
(device-passcode fallback). SecureStore holds only an enabled flag — never a credential —
and the Firebase session stays the source of truth. Live biometric requires a **development
build** (EAS); it can't run in Expo Go or the sandbox.

## Seeding the catalog

Populate Firestore with demo categories and products (placeholder images) using the
gitignored service-account key:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json node scripts/seed.ts
```

Catalog reads go through `@kidswear/data` (TanStack Query); search and sort are client-side
(small-catalog decision — see DECISIONS.md).

## Cloud Functions (Phase 7)

Server-side logic lives in `/functions/` — a **separate workspace** with its own
`tsconfig.json` and `package.json` so it stays out of the monorepo TS build. Two Firestore
triggers:

- `onOrderCreate` — transactional stock decrement; if any line exceeds available stock the
  order is auto-cancelled (`status:'cancelled', cancelReason:'out_of_stock'`) and the customer
  is notified. Otherwise admins are pushed a "new order" notification.
- `onOrderUpdate` — when `status` changes, the customer is notified (skip on the
  out-of-stock cancellation, which `onOrderCreate` already handled).

Deploy region: `us-central1` (Firebase default).

```bash
cd functions && npm install && npm run build
firebase deploy --only functions
```

## Push notifications (Phase 7)

Two channels: **Expo Push Service** for the mobile app and **FCM** for the web app. Tokens
are stored on `users/{uid}.pushTokens.{expo|fcm}` (arrays — multi-device per user). Functions
fan out by reading those arrays via the admin SDK and clean up `DeviceNotRegistered`
tokens.

Each app registers its token after sign-in, gated by a per-device opt-in flag in Redux
(`notifications.enabled`, persisted alongside cart + ui). The Profile screen has a
**Notifications** section — Switch + status indicator + a local "test notification" button
that works without deploying Functions.

### Web setup

1. Firebase Console → Project Settings → Cloud Messaging → "Web Push certificates" → copy the
   public key into `VITE_FIREBASE_VAPID_KEY` in `.env`.
2. Edit `apps/web/public/firebase-messaging-sw.js` and replace the placeholder Firebase config
   with the same values used in `.env` (Service Workers can't read `import.meta.env`).
3. Build/deploy the site over HTTPS (required for Service Workers).

### Mobile setup (EAS dev build)

Push tokens cannot be retrieved under Expo Go — you need an Expo dev build. iOS additionally
requires a paid Apple Developer account; Android works on any device.

```bash
npm i -g eas-cli         # or use npx eas-cli
cd apps/mobile
eas login
eas build:configure      # writes extra.eas.projectId into app.json
eas build --platform android --profile development
# Install the resulting APK on a real Android device (or use Internal distribution).
```

Set the mirrored `role:'admin'` (via the script above — it now writes both the Auth claim and
`users/{uid}.role = 'admin'`) so `sendToAdmins()` can find the admin user docs.

## Conventions

- **Types are derived from Zod schemas only** — never hand-write a duplicate interface.
- **No `any`** — `@typescript-eslint/no-explicit-any` is an error.
- **Currency** is UZS, stored as integer som, formatted with `Intl.NumberFormat`.
- **Languages**: uz (default + fallback), en, ru.
- UI is implemented per platform; visual consistency comes only from shared tokens.

See [`DECISIONS.md`](./DECISIONS.md) for the rationale behind key choices.
