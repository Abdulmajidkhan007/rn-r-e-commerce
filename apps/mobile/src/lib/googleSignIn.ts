// Note: Google Sign-In requires the native Google Play Services module and
// will not function in a JS-only environment (e.g. a plain simulator without
// Play Services).
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider } from 'firebase/auth';
import { useAuthActions } from '@kidswear/auth';

const WEB_CLIENT_ID = process.env['RN_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '';

let configured = false;

/** Configures the native Google Sign-In module once, lazily. */
function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export function useGoogleSignIn(): { promptAsync: () => Promise<void>; ready: boolean } {
  const { loginWithGoogleCredential } = useAuthActions();

  const ready = Boolean(WEB_CLIENT_ID);

  if (!ready) {
    console.warn(
      '[GoogleSignIn] RN_PUBLIC_GOOGLE_WEB_CLIENT_ID env var is missing. Google Sign-In will be disabled.',
    );
  }

  const promptAsync = async (): Promise<void> => {
    try {
      ensureConfigured();
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      const idToken = res.data?.idToken;
      if (!idToken) {
        console.warn('[GoogleSignIn] signIn() did not return an idToken');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      await loginWithGoogleCredential(credential);
    } catch (err) {
      console.warn('[GoogleSignIn] promptAsync failed:', err);
    }
  };

  return { promptAsync, ready };
}
