import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

/** Auth stack: login + register + forgot-password. */
export default function AuthLayout(): React.ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: t('auth.login.title') }} />
      <Stack.Screen name="register" options={{ title: t('auth.register.title') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.forgot.title') }} />
    </Stack>
  );
}
