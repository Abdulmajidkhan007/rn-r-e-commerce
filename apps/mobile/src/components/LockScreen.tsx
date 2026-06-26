import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOutUser } from '@kidswear/firebase';
import { useTranslation } from '@kidswear/i18n';
import { authenticate } from '@/lib/biometric';
import { useAppLock } from '@/lib/applock/AppLockProvider';

/** Full-screen lock shown while an authenticated session is biometric-locked. */
export function LockScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const { label, unlock } = useAppLock();
  const [busy, setBusy] = useState(false);
  const attempted = useRef(false);

  const run = useCallback(async (): Promise<void> => {
    setBusy(true);
    const result = await authenticate(t('security.unlockPrompt'));
    setBusy(false);
    if (result.ok) unlock();
  }, [t, unlock]);

  // Auto-trigger biometric once on mount.
  useEffect(() => {
    if (!attempted.current) {
      attempted.current = true;
      void run();
    }
  }, [run]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      <MaterialCommunityIcons name="lock" size={64} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
        {t('appName')}
      </Text>

      <Button
        mode="contained"
        icon="fingerprint"
        loading={busy}
        disabled={busy}
        onPress={() => void run()}
      >
        {t('security.unlockWith', { label })}
      </Button>

      <Button mode="text" disabled={busy} onPress={() => void run()}>
        {t('security.retry')}
      </Button>

      <Button mode="text" textColor={theme.colors.error} onPress={() => void signOutUser()}>
        {t('security.signOut')}
      </Button>
    </View>
  );
}
