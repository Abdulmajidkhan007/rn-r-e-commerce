/**
 * Grants the `role: 'admin'` custom claim to a Firebase user.
 *
 * Admin authority in KidsWear is the custom claim — NOT the Firestore profile
 * role (which is only a UX mirror). Setting it is intentionally out-of-band.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
 *     node scripts/set-admin-claim.ts <uid | email>
 *
 * Email is accepted so the GitHub Actions deploy (run from a phone, where the
 * uid is not at hand) can grant admin to the account that already signed up.
 *
 * The service-account key is a SECRET — it is gitignored and must never be
 * committed. After running, the target user must sign out/in (or refresh their
 * ID token) for the new claim to take effect.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function main(): Promise<void> {
  const target = process.argv[2]?.trim();
  // --if-exists: the deploy runs this for the owner on every push; before the
  // owner has signed up there is nobody to promote, and that is not an error.
  const ifExists = process.argv.includes('--if-exists');
  if (!target) {
    console.error('Usage: node scripts/set-admin-claim.ts <uid | email>');
    process.exit(1);
  }

  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
  // The account must exist already — sign up on the site first, then run this.
  let user;
  try {
    user = target.includes('@') ? await getAuth().getUserByEmail(target) : await getAuth().getUser(target);
  } catch (error) {
    if (ifExists && (error as { code?: string }).code === 'auth/user-not-found') {
      console.log(
        `::warning title=Admin hali yo'q::${target} saytda ro'yxatdan o'tmagan. Kirgandan keyin Deploy (Firebase) ni qayta ishga tushiring.`,
      );
      return;
    }
    throw error;
  }
  const uid = user.uid;
  if (user.customClaims?.['role'] === 'admin') {
    console.log(`✓ ${target} allaqachon admin (uid=${uid}).`);
    return;
  }
  await getAuth().setCustomUserClaims(uid, { ...user.customClaims, role: 'admin' });

  // Mirror the role onto the user doc so Cloud Functions can query admins for
  // push fan-out. The custom claim stays the source of truth for rules.
  await getFirestore().collection('users').doc(uid).set({ role: 'admin' }, { merge: true });

  console.log(`✓ Set role:admin for uid=${uid}. The user must re-login to refresh their token.`);
}

void main().catch((error: unknown) => {
  console.error('Failed to set admin claim:', error);
  process.exit(1);
});
