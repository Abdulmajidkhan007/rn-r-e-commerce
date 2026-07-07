import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';

const rnBiometrics = new ReactNativeBiometrics();

const KEYCHAIN_SERVICE = 'kidswear.applock';

export type BiometricLabel = 'Face ID' | 'Fingerprint' | 'Biometrics';

export type AuthOutcome = { ok: true } | { ok: false; reason: string };

/** Hardware present AND at least one biometric enrolled. */
export async function isAvailable(): Promise<boolean> {
  const { available } = await rnBiometrics.isSensorAvailable();
  return available;
}

/** Human label for the strongest supported modality. */
export async function getLabel(): Promise<BiometricLabel> {
  const { biometryType } = await rnBiometrics.isSensorAvailable();
  if (biometryType === BiometryTypes.FaceID) {
    return 'Face ID';
  }
  if (biometryType === BiometryTypes.TouchID || biometryType === BiometryTypes.Biometrics) {
    return 'Fingerprint';
  }
  return 'Biometrics';
}

/** Prompts for biometric (device-passcode fallback is handled by the OS prompt). */
export async function authenticate(promptMessage: string): Promise<AuthOutcome> {
  try {
    const { success } = await rnBiometrics.simplePrompt({ promptMessage });
    if (success) {
      return { ok: true };
    }
    return { ok: false, reason: 'not authenticated' };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'unknown' };
  }
}

// --- Preference (Keychain): stores ONLY a boolean flag, never a credential. ---

export async function getEnabled(): Promise<boolean> {
  const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  return result !== false && result.password === 'enabled';
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await Keychain.setGenericPassword('applock', enabled ? 'enabled' : 'disabled', {
    service: KEYCHAIN_SERVICE,
  });
}
