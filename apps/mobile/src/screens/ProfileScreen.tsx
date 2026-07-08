import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Chip, Divider, List, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { AddressSection } from '@/components/profile/AddressSection';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { SecuritySection } from '@/components/profile/SecuritySection';
import { NotificationsSection } from '@/components/profile/NotificationsSection';

export function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, isAuthenticated, status } = useAuth();
  const { logout } = useAuthActions();

  // Protect the profile tab; catalog/home/cart stay public.
  const needsAuth = status !== 'idle' && !isAuthenticated;

  useEffect(() => {
    if (needsAuth) {
      navigation.navigate('Login');
    }
  }, [needsAuth, navigation]);

  if (needsAuth) return <View style={{ flex: 1 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
        {t('auth.profile.title')}
      </Text>

      <Card mode="outlined">
        <Card.Content style={{ gap: 16 }}>
          <AvatarUploader />
          <View>
            <Text variant="titleMedium">{user?.displayName || '—'}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {user?.email}
            </Text>
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

      <Card mode="outlined">
        <List.Item
          title={t('orders.myOrders')}
          left={(props) => <List.Icon {...props} icon="receipt" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Orders')}
        />
      </Card>

      <ProfileForm />
      <AddressSection />
      <SecuritySection />
      <NotificationsSection />

      <Card mode="outlined">
        <List.Item
          title={t('footer.privacy')}
          left={(props) => <List.Icon {...props} icon="shield-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Privacy')}
        />
        <List.Item
          title={t('footer.terms')}
          left={(props) => <List.Icon {...props} icon="file-document-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Terms')}
        />
      </Card>
    </ScrollView>
  );
}
