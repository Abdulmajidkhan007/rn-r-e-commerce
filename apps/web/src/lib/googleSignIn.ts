import { GoogleAuthProvider, signInWithPopup, type AuthCredential } from 'firebase/auth';
import { getFirebase } from '@kidswear/firebase';

/** Opens the Google sign-in popup and returns the OAuth credential.
 *  Throws a Firebase auth error if the popup was closed or blocked —
 *  the caller should catch and pass the error code to mapAuthError. */
export async function signInWithGooglePopup(): Promise<AuthCredential> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential) {
    throw new Error('auth/credential-null');
  }
  return credential;
}
