/**
 * Reports what Google sign-in needs from Firebase Auth, as GitHub Actions
 * annotations (readable on the run page — the owner works from a phone):
 *   - the Google provider is enabled;
 *   - the live Hosting domains are authorized for OAuth.
 * Read-only: it never changes the project. Enabling the provider needs the
 * OAuth client secret, which only the Firebase Console creates.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
 *     node scripts/check-auth-config.ts <projectId>
 */
import { readFileSync } from 'node:fs';
import { cert, type ServiceAccount } from 'firebase-admin/app';

const API = 'https://identitytoolkit.googleapis.com/admin/v2/projects';

async function getJson(url: string, token: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main(): Promise<void> {
  const projectId = process.argv[2]?.trim();
  if (!projectId) {
    console.error('Usage: node scripts/check-auth-config.ts <projectId>');
    process.exit(1);
  }
  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
  const credential = cert(JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount);
  const { access_token: token } = await credential.getAccessToken();

  const google = await getJson(`${API}/${projectId}/defaultSupportedIdpConfigs/google.com`, token);
  const enabled =
    google.status === 200 && (google.body as { enabled?: boolean } | null)?.enabled === true;
  if (enabled) {
    console.log('✓ Google provider yoqilgan');
  } else {
    console.log(
      `::warning title=Google bilan kirish o'chiq::Firebase Console → Authentication → Sign-in method → Google → Enable → Save. (API: ${google.status})`,
    );
  }

  const config = await getJson(`${API}/${projectId}/config`, token);
  const domains = (config.body as { authorizedDomains?: string[] } | null)?.authorizedDomains ?? [];
  const needed = [`${projectId}.web.app`, `${projectId}.firebaseapp.com`];
  const missing = needed.filter((d) => !domains.includes(d));
  if (config.status !== 200) {
    console.log(`::warning title=Auth config o'qilmadi::HTTP ${config.status}`);
  } else if (missing.length > 0) {
    console.log(
      `::warning title=Ruxsat etilmagan domen::Authentication → Settings → Authorized domains ga qo'shing: ${missing.join(', ')}`,
    );
  } else {
    console.log(`✓ Authorized domains: ${domains.join(', ')}`);
  }
}

void main().catch((error: unknown) => {
  // A diagnostic must never fail the deploy.
  console.log(`::warning title=Auth tekshiruvi ishlamadi::${String(error)}`);
});
