import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ActivityIndicator, Button, Card, Dialog, Divider, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCancelOrder, useOrder } from '@kidswear/data';
import { useAppSelector } from '@kidswear/store';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import type { RootStackParamList } from '@/navigation/types';

export function OrderDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>();
  const id = params?.id ?? '';
  const language = useAppSelector((s) => s.ui.language);
  const { order, loading } = useOrder(id);
  const { cancel, isPending } = useCancelOrder();
  const [confirmVisible, setConfirmVisible] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text variant="headlineSmall">404</Text>
        <Text style={{ opacity: 0.7 }}>{t('orders.noOrders')}</Text>
      </View>
    );
  }

  const canCancel = order.status === 'pending' || order.status === 'deposit_paid';
  const remaining = order.total - order.paidAmount;
  const addr = order.shippingAddress;

  const doCancel = async (): Promise<void> => {
    await cancel(order.id);
    setConfirmVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text variant="titleLarge" style={{ flex: 1, fontWeight: '800' }}>
          {formatDate(order.createdAt, language)}
        </Text>
        <OrderStatusChip status={order.status} />
      </View>

      <Card mode="outlined">
        <Card.Content>
          <OrderStatusTimeline status={order.status} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 6 }}>
          {order.items.map((item) => (
            <View
              key={`${item.productId}-${item.size}-${item.color}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {item.name} × {item.quantity} ({item.size}/{item.color})
              </Text>
              <Text variant="bodySmall">{formatPrice(item.price * item.quantity, language)}</Text>
            </View>
          ))}
          <Divider />
          <Row label={t('cart.subtotal')} value={formatPrice(order.subtotal, language)} />
          <Row label={t('orders.paid')} value={formatPrice(order.paidAmount, language)} />
          <Row label={t('cart.remaining')} value={formatPrice(remaining, language)} />
          <Row label={t('cart.total')} value={formatPrice(order.total, language)} strong />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 2 }}>
          <Text variant="titleMedium">{t('checkout.shippingAddress')}</Text>
          <Text variant="bodyMedium">{addr.fullName}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {addr.region}, {addr.district}, {addr.street}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {addr.phone}
          </Text>
        </Card.Content>
      </Card>

      {canCancel ? (
        <Button
          mode="outlined"
          textColor="red"
          disabled={isPending}
          onPress={() => setConfirmVisible(true)}
        >
          {t('orders.cancelOrder')}
        </Button>
      ) : null}

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>{t('orders.confirmCancel')}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>{t('actions.cancel')}</Button>
            <Button textColor="red" disabled={isPending} onPress={() => void doCancel()}>
              {t('orders.cancelOrder')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="bodyMedium" style={{ opacity: strong ? 1 : 0.7 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: strong ? '800' : '400' }}>
        {value}
      </Text>
    </View>
  );
}
