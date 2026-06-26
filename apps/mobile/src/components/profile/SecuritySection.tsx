import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, HelperText, List, Switch, Text } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import {
  authenticate,
  getEnabled,
  getLabel,
  isAvailable,
  setEnabled as persistEnabled,
  type BiometricLabel,
} from '@/lib/biometric';
import { useAppLock } from '@/lib/applock/AppLockProvider';
import { useTranslateKey } from '@/lib/useTranslateKey';

export function SecuritySection(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { notice, clearNotice, refresh } = useAppLock();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [label, setLabel] = useState<BiometricLabel>('Biometrics');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const avail = await isAvailable();
      if (!active) return;
      setAvailable(avail);
      if (avail) {
        setLabel(await getLabel());
        setEnabled(await getEnabled());
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onToggle = async (next: boolean): Promise<void> => {
    setBusy(true);
    try {
      if (next) {
        // Confirm with a real biometric prompt before enabling.
        const result = await authenticate(t('security.unlockPrompt'));
        if (!result.ok) return;
        await persistEnabled(true);
        setEnabled(true);
      } else {
        await persistEnabled(false);
        setEnabled(false);
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 4 }}>
        <Text variant="titleMedium">{t('security.security')}</Text>

        {notice ? (
          <HelperText type="info" visible onPress={clearNotice}>
            {tk(notice)}
          </HelperText>
        ) : null}

        {available === false ? (
          <View style={{ opacity: 0.6 }}>
            <List.Item
              title={t('security.enableBiometric', { label: t('security.biometrics') })}
              description={t('security.biometricNotAvailable')}
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => <Switch value={false} disabled />}
            />
          </View>
        ) : (
          <List.Item
            title={t('security.unlockWith', { label })}
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={enabled}
                disabled={busy || available === null}
                onValueChange={(v) => void onToggle(v)}
              />
            )}
          />
        )}
      </Card.Content>
    </Card>
  );
}
