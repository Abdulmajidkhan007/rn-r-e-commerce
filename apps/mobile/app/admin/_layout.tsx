import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

/**
 * Admin stack: dashboard, products, orders.
 * TODO(auth): gate this group on an admin role once auth lands.
 */
export default function AdminLayout(): React.ReactElement {
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
      <Stack.Screen name="index" options={{ title: t('nav.admin') }} />
      <Stack.Screen name="products" options={{ title: t('nav.catalog') }} />
      <Stack.Screen name="orders" options={{ title: 'Orders' }} />
    </Stack>
  );
}
