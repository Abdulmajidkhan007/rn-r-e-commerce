import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Avatar, Button, Card, Chip, Divider, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { AddressSection } from '@/components/profile/AddressSection';
import { SecuritySection } from '@/components/profile/SecuritySection';

export default function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, isAuthenticated, status } = useAuth();
  const { logout } = useAuthActions();

  // Protect the profile tab; catalog/home/cart stay public.
  if (status !== 'idle' && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
        {t('auth.profile.title')}
      </Text>

      <Card mode="outlined">
        <Card.Content style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar.Text size={48} label={initial} />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">{user?.displayName || '—'}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                {user?.email}
              </Text>
            </View>
          </View>

          <Divider />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
              {t('auth.profile.roleLabel')}:
            </Text>
            <Chip compact icon={isAdmin ? 'shield-account' : 'account'}>
              {isAdmin ? t('auth.roles.admin') : t('auth.roles.customer')}
            </Chip>
          </View>

          <Button mode="outlined" onPress={() => void logout()}>
            {t('auth.actions.logout')}
          </Button>
        </Card.Content>
      </Card>

      <ProfileForm />
      <AddressSection />
      <SecuritySection />
    </ScrollView>
  );
}
