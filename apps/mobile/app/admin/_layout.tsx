import { Redirect, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';

/** Admin stack: dashboard, products, orders — gated on the admin custom claim. */
export default function AdminLayout(): React.ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin, status } = useAuth();

  if (status !== 'idle' && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  if (status !== 'idle' && !isAdmin) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('nav.admin') }} />
      <Stack.Screen name="products" options={{ title: t('nav.catalog') }} />
      <Stack.Screen name="orders" options={{ title: 'Orders' }} />
    </Stack>
  );
}
