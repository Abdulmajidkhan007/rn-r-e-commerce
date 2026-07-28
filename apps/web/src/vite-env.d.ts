/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  /** Web Push (FCM): "Web Push certificates" public key from Firebase Console. */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  /** UX-only hint for which email is the admin; real authority is the custom claim. */
  readonly VITE_ADMIN_EMAIL?: string;

  /** Payme merchant id. Absent = Payme is not offered at checkout. */
  readonly VITE_PAYME_MERCHANT_ID?: string;
  /** Account field configured in the Payme cabinet; defaults to order_id. */
  readonly VITE_PAYME_ACCOUNT_FIELD?: string;
  /** Sandbox checkout host override. */
  readonly VITE_PAYME_CHECKOUT_URL?: string;

  /** Click merchant + service ids. Both required, or Click is not offered. */
  readonly VITE_CLICK_MERCHANT_ID?: string;
  readonly VITE_CLICK_SERVICE_ID?: string;
  readonly VITE_CLICK_CHECKOUT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
