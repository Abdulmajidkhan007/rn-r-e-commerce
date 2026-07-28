// Bare RN has no Node runtime, so @types/node would be wrong here: `process.env`
// reads are not runtime lookups at all — babel substitutes each one with a literal
// at build time (see babel.config.js). This declares exactly the names on that
// allowlist, so a typo fails type-check instead of silently inlining `undefined`.
declare const process: {
  readonly env: {
    readonly RN_PUBLIC_FIREBASE_API_KEY?: string;
    readonly RN_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    readonly RN_PUBLIC_FIREBASE_PROJECT_ID?: string;
    readonly RN_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    readonly RN_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly RN_PUBLIC_FIREBASE_APP_ID?: string;
    readonly RN_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
    readonly RN_PUBLIC_ADMIN_EMAIL?: string;
    readonly RN_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  };
};
