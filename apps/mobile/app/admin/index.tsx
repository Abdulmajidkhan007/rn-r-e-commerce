import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, List, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderStatus } from '@kidswear/core';
import { summarizeDashboard, useAdminProducts, useAllOrders } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';

const STATUS_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

function StatCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card mode="outlined" style={{ flexGrow: 1, flexBasis: '45%' }}>
      <Card.Content style={{ gap: 4 }}>
        <Text variant="bodySmall" style={{ opacity: 0.7 }}>
          {label}
        </Text>
        <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function AdminDashboardScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { orders } = useAllOrders();
  const { data: products = [] } = useAdminProducts();

  const stats = useMemo(() => summarizeDashboard(orders, products), [orders, products]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label={t('dashboardStats.totalProducts')} value={String(stats.totalProducts)} />
        <StatCard label={t('dashboardStats.lowStock')} value={String(stats.lowStock)} />
        <StatCard label={t('dashboardStats.totalOrders')} value={String(stats.totalOrders)} />
        <StatCard
          label={t('dashboardStats.depositsCollected')}
          value={formatPrice(stats.depositsCollected, language)}
        />
      </View>

      <Card mode="outlined">
        <Card.Title title={t('dashboardStats.byStatus')} />
        <Card.Content>
          {(Object.keys(stats.byStatus) as OrderStatus[]).map((status) => (
            <View
              key={status}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text variant="bodyMedium">{t(STATUS_LABEL[status])}</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {stats.byStatus[status]}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <List.Item
          title={t('admin.products')}
          left={(props) => <List.Icon {...props} icon="tshirt-crew" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/admin/products')}
        />
        <List.Item
          title={t('admin.categories')}
          left={(props) => <List.Icon {...props} icon="shape" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/admin/categories')}
        />
        <List.Item
          title={t('admin.orders')}
          left={(props) => <List.Icon {...props} icon="receipt" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/admin/orders')}
        />
      </Card>
    </ScrollView>
  );
}
