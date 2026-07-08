import { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order } from '@kidswear/core';
import { useAuth } from '@kidswear/auth';
import { useUserOrders } from '@kidswear/data';
import { useAppSelector } from '@kidswear/store';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';

export function OrdersScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, status } = useAuth();
  const language = useAppSelector((s) => s.ui.language);
  const { orders, loading } = useUserOrders(user?.uid);

  const needsAuth = status !== 'idle' && !isAuthenticated;

  useEffect(() => {
    if (needsAuth) {
      navigation.navigate('Login');
    }
  }, [needsAuth, navigation]);

  if (needsAuth) return <View style={{ flex: 1 }} />;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Order }): React.ReactElement => {
    const count = item.items.reduce((n, i) => n + i.quantity, 0);
    return (
      <Card mode="outlined" onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
        <Card.Content style={{ gap: 6 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {formatDate(item.createdAt, language)}
            </Text>
            <OrderStatusChip status={item.status} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium">
              {count} {t('orders.items')}
            </Text>
            <Text variant="titleSmall">{formatPrice(item.total, language)}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      ListEmptyComponent={
        <View style={{ paddingVertical: 64, alignItems: 'center', gap: 12 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {t('orders.noOrders')}
          </Text>
          <Button mode="contained" onPress={() => navigation.navigate('Tabs', { screen: 'Catalog' })}>
            {t('nav.catalog')}
          </Button>
        </View>
      }
    />
  );
}
