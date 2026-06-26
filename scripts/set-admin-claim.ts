/**
 * Grants the `role: 'admin'` custom claim to a Firebase user.
 *
 * Admin authority in KidsWear is the custom claim — NOT the Firestore profile
 * role (which is only a UX mirror). Setting it is intentionally out-of-band.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
 *     node scripts/set-admin-claim.ts <uid>
 *
 * The service-account key is a SECRET — it is gitignored and must never be
 * committed. After running, the target user must sign out/in (or refresh their
 * ID token) for the new claim to take effect.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main(): Promise<void> {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/set-admin-claim.ts <uid>');
    process.exit(1);
  }

  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
  await getAuth().setCustomUserClaims(uid, { role: 'admin' });

  console.log(`✓ Set role:admin for uid=${uid}. The user must re-login to refresh their token.`);
}

void main().catch((error: unknown) => {
  console.error('Failed to set admin claim:', error);
  process.exit(1);
});
