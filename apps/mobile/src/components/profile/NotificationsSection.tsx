import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, Card, HelperText, List, Snackbar, Switch, Text } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import { useAppDispatch, useAppSelector, setNotificationsEnabled, setExpoPushToken } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import {
  ensurePermission,
  registerForPushNotifications,
  sendTestNotification,
  unregisterPushToken,
} from '@/lib/push';

export function NotificationsSection(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user, status } = useAuth();

  const enabled = useAppSelector((s) => s.notifications.enabled);
  const expoToken = useAppSelector((s) => s.notifications.expoToken);

  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);

  const isAuthenticated = status === 'authenticated';

  const onToggle = async (next: boolean): Promise<void> => {
    if (busy || !isAuthenticated || !user) return;
    setBusy(true);
    setPermissionDenied(false);

    try {
      if (next) {
        const granted = await ensurePermission();
        if (!granted) {
          setPermissionDenied(true);
          dispatch(setNotificationsEnabled(false));
          return;
        }
        dispatch(setNotificationsEnabled(true));
        const token = await registerForPushNotifications(user.uid);
        if (token !== null) {
          dispatch(setExpoPushToken(token));
        }
      } else {
        if (expoToken !== null) {
          await unregisterPushToken(user.uid, expoToken);
        }
        dispatch(setExpoPushToken(null));
        dispatch(setNotificationsEnabled(false));
      }
    } finally {
      setBusy(false);
    }
  };

  const onTestNotification = async (): Promise<void> => {
    try {
      await sendTestNotification(
        t('notifications.testTitle'),
        t('notifications.testBody'),
      );
      setSnackVisible(true);
    } catch (err) {
      console.warn('[push] sendTestNotification failed:', err);
    }
  };

  const statusIcon = enabled && expoToken !== null ? 'bell' : 'bell-off';
  const statusText =
    permissionDenied
      ? t('notifications.permissionDenied')
      : enabled && expoToken !== null
        ? t('notifications.enabled')
        : t('notifications.disabled');

  return (
    <>
      <Card mode="outlined">
        <Card.Content style={{ gap: 4 }}>
          <Text variant="titleMedium">{t('notifications.title')}</Text>

          {permissionDenied ? (
            <HelperText type="error" visible>
              {t('notifications.permissionDenied')}
            </HelperText>
          ) : null}

          <List.Item
            title={t('notifications.enableNotifications')}
            description={statusText}
            left={(props) => <List.Icon {...props} icon={statusIcon} />}
            right={() => (
              <Switch
                value={enabled}
                disabled={busy || !isAuthenticated}
                onValueChange={(v) => void onToggle(v)}
              />
            )}
          />

          {permissionDenied ? (
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                icon="cog"
                mode="outlined"
                onPress={() => void Linking.openSettings()}
              >
                {t('notifications.openSystemSettings')}
              </Button>
            </View>
          ) : null}

          {enabled && expoToken !== null ? (
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                icon="bell-ring"
                mode="outlined"
                onPress={() => void onTestNotification()}
              >
                {t('notifications.testNotification')}
              </Button>
            </View>
          ) : null}
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
      >
        {t('notifications.testSent')}
      </Snackbar>
    </>
  );
}
