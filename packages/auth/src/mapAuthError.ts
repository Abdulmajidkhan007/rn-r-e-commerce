/** Maps a Firebase auth error to an i18n message key (under `auth.errors.*`). */
const CODE_TO_KEY: Record<string, string> = {
  'auth/wrong-password': 'auth.errors.wrongPassword',
  'auth/user-not-found': 'auth.errors.userNotFound',
  'auth/email-already-in-use': 'auth.errors.emailInUse',
  'auth/invalid-email': 'auth.errors.invalidEmail',
  'auth/weak-password': 'auth.errors.weakPassword',
  'auth/too-many-requests': 'auth.errors.tooManyRequests',
  'auth/network-request-failed': 'auth.errors.network',
  'auth/invalid-credential': 'auth.errors.invalidCredential',
  'auth/popup-closed-by-user': 'auth.errors.popupClosed',
  'auth/cancelled-popup-request': 'auth.errors.popupClosed',
  'auth/popup-blocked': 'auth.errors.popupBlocked',
  'auth/account-exists-with-different-credential': 'auth.errors.accountExists',
};

const FALLBACK_KEY = 'auth.errors.generic';

function extractCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/** Resolves any caught auth error to a localized message key, with a fallback. */
export function mapAuthError(error: unknown): string {
  const code = extractCode(error);
  if (code && code in CODE_TO_KEY) {
    return CODE_TO_KEY[code] as string;
  }
  return FALLBACK_KEY;
}
