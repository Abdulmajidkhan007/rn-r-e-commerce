/**
 * Writes the newest APK's version to Firestore `settings/app` (merge, so the
 * admin's `minVersionCode` is kept). Run by apk-release.yml after the release is
 * published; credentials come from GOOGLE_APPLICATION_CREDENTIALS.
 *
 *   PROJECT_ID, VERSION_CODE, APK_URL are read from the environment.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const { PROJECT_ID, VERSION_CODE, APK_URL, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
const code = Number.parseInt(VERSION_CODE ?? '', 10);
if (
  !PROJECT_ID ||
  !APK_URL ||
  !GOOGLE_APPLICATION_CREDENTIALS ||
  !Number.isInteger(code) ||
  code < 1
) {
  console.error(
    'PROJECT_ID, APK_URL, GOOGLE_APPLICATION_CREDENTIALS and a positive VERSION_CODE are required.',
  );
  process.exit(1);
}

const credential = cert(JSON.parse(readFileSync(GOOGLE_APPLICATION_CREDENTIALS, 'utf8')));
initializeApp({ credential, projectId: PROJECT_ID });
await getFirestore()
  .doc('settings/app')
  .set(
    { latestVersionCode: code, latestVersionName: `1.0.${code}`, apkUrl: APK_URL },
    { merge: true },
  );
console.log(`settings/app -> latestVersionCode=${code}`);
