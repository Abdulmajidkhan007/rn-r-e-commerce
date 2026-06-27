import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTranslation } from '@kidswear/i18n';
import { useAppDispatch, useAppSelector, setNotificationsEnabled, setFcmPushToken } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { Card } from '@/components';
import {
  registerForPushNotifications,
  unregisterPushToken,
  sendTestNotification,
} from '@/lib/push';

export default function NotificationsSection(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const enabled = useAppSelector((s) => s.notifications.enabled);
  const fcmToken = useAppSelector((s) => s.notifications.fcmToken);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Determine status text
  const getStatusText = (): string => {
    if (!enabled) return t('notifications.disabled');
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
      return t('notifications.permissionDenied');
    }
    if (fcmToken) return t('notifications.enabled');
    return t('notifications.disabled');
  };

  const handleToggle = async (checked: boolean): Promise<void> => {
    if (!user) return;

    if (checked) {
      // Optimistically enable — will revert below if permission is denied
      dispatch(setNotificationsEnabled(true));
      const token = await registerForPushNotifications(user.uid);
      if (token) {
        dispatch(setFcmPushToken(token));
      } else {
        // Permission was denied or registration failed — revert
        dispatch(setNotificationsEnabled(false));
        dispatch(setFcmPushToken(null));
      }
    } else {
      if (fcmToken) {
        await unregisterPushToken(user.uid, fcmToken);
      }
      dispatch(setFcmPushToken(null));
      dispatch(setNotificationsEnabled(false));
    }
  };

  const handleTest = async (): Promise<void> => {
    try {
      await sendTestNotification(t('notifications.testTitle'), t('notifications.testBody'));
      setSnackbarMessage(t('notifications.testSent'));
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage(t('notifications.permissionDenied'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (): void => setSnackbarOpen(false);

  return (
    <>
      <Card>
        <Stack spacing={2}>
          <Typography variant="h6">{t('notifications.title')}</Typography>

          <Typography variant="body2" color="text.secondary">
            {getStatusText()}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => {
                  void handleToggle(e.target.checked);
                }}
              />
            }
            label={
              enabled
                ? t('notifications.disableNotifications')
                : t('notifications.enableNotifications')
            }
          />

          <Button
            variant="outlined"
            disabled={!enabled || !fcmToken}
            onClick={() => {
              void handleTest();
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('notifications.testNotification')}
          </Button>
        </Stack>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} onClose={handleSnackbarClose}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
