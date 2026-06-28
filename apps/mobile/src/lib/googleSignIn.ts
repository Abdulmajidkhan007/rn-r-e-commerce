// Note: Live Google Sign-In requires an EAS dev build.
// expo-auth-session compiles in Expo Go but will not return a real token there.
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider } from 'firebase/auth';
import { useEffect } from 'react';
import { useAuthActions } from '@kidswear/auth';

const WEB_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
const ANDROID_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'];
const IOS_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'];

export function useGoogleSignIn() {
  const { loginWithGoogleCredential } = useAuthActions();

  if (!WEB_CLIENT_ID || !ANDROID_CLIENT_ID || !IOS_CLIENT_ID) {
    console.warn(
      '[GoogleSignIn] One or more EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars are missing. Google Sign-In will be disabled.',
    );
  }

  const ready = Boolean(WEB_CLIENT_ID && ANDROID_CLIENT_ID && IOS_CLIENT_ID);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        void loginWithGoogleCredential(credential);
      }
    }
  }, [response, loginWithGoogleCredential]);

  return { promptAsync, ready: ready && Boolean(request) };
}
