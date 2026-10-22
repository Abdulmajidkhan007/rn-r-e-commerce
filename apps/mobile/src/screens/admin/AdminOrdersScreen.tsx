import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Card, Menu, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order, OrderStatus } from '@kidswear/core';
import { useAuth } from '@kidswear/auth';
import { stockErrorMessage, useAllOrders, useUpdateOrderStatus } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatDateTime, formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';

const STATUSES: readonly OrderStatus[] = [
  'pending',
  'deposit_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const STATUS_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

function OrderRow({
  order,
  language,
  onUpdate,
}: {
  order: Order;
  language: 'uz' | 'en' | 'ru';
  onUpdate: (status: OrderStatus) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {formatDateTime(order.createdAt, language)}
          </Text>
          <OrderStatusChip status={order.status} />
        </View>
        <Text variant="titleSmall">{order.shippingAddress.fullName}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyMedium">{formatPrice(order.total, language)}</Text>
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <Button mode="outlined" icon="menu-down" onPress={() => setMenuOpen(true)}>
                {t('adminOrders.updateStatus')}
              </Button>
            }
          >
            {STATUSES.map((s) => (
              <Menu.Item
                key={s}
                title={t(STATUS_LABEL[s])}
                onPress={() => {
                  setMenuOpen(false);
                  onUpdate(s);
                }}
              />
            ))}
          </Menu>
        </View>
      </Card.Content>
    </Card>
  );
}

export function AdminOrdersScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const [filterMenu, setFilterMenu] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { orders, loading } = useAllOrders(filter || undefined);
  const { user } = useAuth();
  const updateStatus = useUpdateOrderStatus();

  // Runs in the stock transaction: a shortfall aborts it and the status stays.
  const onUpdate = (id: string, status: OrderStatus): void => {
    if (!user) return;
    updateStatus.mutate(
      { id, status, by: user.uid },
      {
        onSuccess: ({ action }) =>
          setNotice(
            action === 'apply'
              ? t('adminOrders.stockTaken')
              : action === 'return'
                ? t('adminOrders.stockReturned')
                : t('adminOrders.statusUpdated'),
          ),
        onError: (error) => {
          const msg = stockErrorMessage(error, orders.find((o) => o.id === id));
          setNotice(t(msg.key, { defaultValue: msg.key, ...msg.params }));
        },
      },
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Menu
          visible={filterMenu}
          onDismiss={() => setFilterMenu(false)}
          anchor={
            <Button mode="outlined" icon="filter-variant" onPress={() => setFilterMenu(true)}>
              {filter ? t(STATUS_LABEL[filter]) : t('adminOrders.all')}
            </Button>
          }
        >
          <Menu.Item
            title={t('adminOrders.all')}
            onPress={() => {
              setFilter('');
              setFilterMenu(false);
            }}
          />
          {STATUSES.map((s) => (
            <Menu.Item
              key={s}
              title={t(STATUS_LABEL[s])}
              onPress={() => {
                setFilter(s);
                setFilterMenu(false);
              }}
            />
          ))}
        </Menu>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <OrderRow order={item} language={language} onUpdate={(s) => onUpdate(item.id, s)} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 12,
            paddingBottom: insets.bottom + 24,
          }}
          ListEmptyComponent={
            <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: 24 }}>
              {t('adminOrders.noOrders')}
            </Text>
          }
        />
      )}

      <Snackbar visible={notice !== null} onDismiss={() => setNotice(null)} duration={4000}>
        {notice ?? ''}
      </Snackbar>
    </View>
  );
}
