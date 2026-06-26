import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricLabel = 'Face ID' | 'Fingerprint' | 'Biometrics';

export type AuthOutcome = { ok: true } | { ok: false; reason: string };

/** Hardware present AND at least one biometric enrolled. */
export async function isAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

/** Human label for the strongest supported modality. */
export async function getLabel(): Promise<BiometricLabel> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  return 'Biometrics';
}

/** Prompts for biometric (with device-passcode fallback enabled). */
export async function authenticate(promptMessage: string): Promise<AuthOutcome> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  if (result.success) {
    return { ok: true };
  }
  return { ok: false, reason: result.error ?? 'unknown' };
}

// --- Preference (SecureStore): stores ONLY a boolean, never a credential. ---

const BIOMETRIC_ENABLED = 'BIOMETRIC_ENABLED';

export async function getEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED);
  return value === 'true';
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}
