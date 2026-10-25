import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  DataTable,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order } from '@kidswear/core';
import {
  periodFromDays,
  profitPresetRange,
  summarizeProfit,
  summarizeSales,
  useAllOrders,
  useOrderCosts,
  type ProfitPreset,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { useNow } from '@/lib/useNow';

function Stat({ title, value }: { title: string; value: string }): React.ReactElement {
  return (
    <Card mode="outlined" style={{ flex: 1, minWidth: '45%' }}>
      <Card.Content style={{ gap: 4 }}>
        <Text variant="labelMedium" style={{ opacity: 0.7 }}>
          {title}
        </Text>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  );
}

/**
 * Read-only profit for a preset period (costs are entered on the web admin).
 * Same `orderCosts` snapshots and maths as the web report.
 */
function ProfitCard({
  orders,
  now,
}: {
  orders: readonly Order[];
  now: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const costs = useOrderCosts();
  const [preset, setPreset] = useState<ProfitPreset>('thisMonth');
  const report = useMemo(() => {
    const period = periodFromDays(profitPresetRange(preset, now));
    return costs.data && period ? summarizeProfit(orders, costs.data, period) : null;
  }, [orders, costs.data, preset, now]);
  const money = (n: number): string => formatPrice(n, language);

  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 8 }}>
        <Text variant="titleMedium">{t('profit.title')}</Text>
        <SegmentedButtons
          value={preset}
          onValueChange={(v) => setPreset(v as ProfitPreset)}
          density="small"
          buttons={[
            { value: 'thisMonth', label: t('profit.thisMonth') },
            { value: 'last12m', label: t('profit.last12m') },
            { value: 'all', label: t('profit.all') },
          ]}
        />
        {costs.isLoading ? (
          <ActivityIndicator />
        ) : !report ? (
          <Text style={{ color: theme.colors.error }}>{t('profit.loadFailed')}</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat title={t('profit.revenue')} value={money(report.revenue)} />
              <Stat title={t('profit.cost')} value={money(report.cost)} />
              <Stat title={t('profit.profit')} value={money(report.profit)} />
              <Stat
                title={t('profit.margin')}
                value={report.margin === null ? '—' : `${(report.margin * 100).toFixed(1)}%`}
              />
            </View>
            {report.uncostedOrders > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {t('profit.uncosted', { count: report.uncostedOrders })}
              </Text>
            )}
            <Text variant="labelSmall" style={{ opacity: 0.6 }}>
              {t('profit.note')}
            </Text>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

export function AdminReportsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { orders, loading } = useAllOrders();
  const now = useNow();
  const [range, setRange] = useState<'daily' | 'monthly'>('daily');
  const report = useMemo(() => summarizeSales(orders, now), [orders, now]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const buckets = range === 'daily' ? report.daily : report.monthly;
  const max = Math.max(1, ...buckets.map((b) => b.revenue));
  const label = (key: string): string => (range === 'daily' ? key.slice(5).replace('-', '.') : key);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat title={t('adminContent.revenue')} value={formatPrice(report.revenue, language)} />
        <Stat
          title={t('adminContent.averageOrder')}
          value={formatPrice(report.averageOrder, language)}
        />
        <Stat title={t('adminContent.paidOrders')} value={String(report.orders)} />
        <Stat title={t('adminContent.cancelledOrders')} value={String(report.cancelled)} />
      </View>
      <Text variant="bodySmall" style={{ opacity: 0.7 }}>
        {t('adminContent.discountsGiven', { amount: formatPrice(report.discounts, language) })}
      </Text>

      <ProfitCard orders={orders} now={now} />

      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">{t('adminContent.salesChart')}</Text>
          <SegmentedButtons
            value={range}
            onValueChange={(v) => setRange(v as 'daily' | 'monthly')}
            buttons={[
              { value: 'daily', label: t('adminContent.last30Days') },
              { value: 'monthly', label: t('adminContent.last12Months') },
            ]}
          />
          {/* Plain bars — no chart library for one admin view. */}
          <View
            accessibilityLabel={buckets
              .map((b) => `${label(b.key)}: ${formatPrice(b.revenue, language)}`)
              .join('; ')}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 2,
              height: 140,
              paddingTop: 8,
            }}
          >
            {buckets.map((b) => (
              <View
                key={b.key}
                style={{
                  flex: 1,
                  height: `${Math.max(2, (b.revenue / max) * 100)}%`,
                  backgroundColor:
                    b.revenue > 0 ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="labelSmall">{label(buckets[0]?.key ?? '')}</Text>
            <Text variant="labelSmall">{label(buckets.at(-1)?.key ?? '')}</Text>
          </View>
          <Text variant="labelSmall" style={{ opacity: 0.6 }}>
            {t('adminContent.reportNote')}
          </Text>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title={t('adminContent.topProducts')} />
        {report.topProducts.length === 0 ? (
          <Card.Content>
            <Text style={{ opacity: 0.7 }}>{t('adminContent.noSales')}</Text>
          </Card.Content>
        ) : (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t('admin.name')}</DataTable.Title>
              <DataTable.Title numeric>{t('adminContent.sold')}</DataTable.Title>
              <DataTable.Title numeric>{t('adminContent.revenue')}</DataTable.Title>
            </DataTable.Header>
            {report.topProducts.map((p) => (
              <DataTable.Row key={p.productId}>
                <DataTable.Cell>{p.name}</DataTable.Cell>
                <DataTable.Cell numeric>{p.quantity}</DataTable.Cell>
                <DataTable.Cell numeric>{formatPrice(p.revenue, language)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </Card>
    </ScrollView>
  );
}
