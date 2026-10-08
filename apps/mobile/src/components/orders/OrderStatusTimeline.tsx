import { View } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import type { OrderStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

const STEPS = ['pending', 'deposit_paid', 'processing', 'shipped', 'delivered'] as const;

const STEP_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
} as const;

export interface OrderStatusTimelineProps {
  status: OrderStatus;
  cancelReason?: string;
}

/** Vertical 5-step order-progress timeline; cancelled renders as an error pill. */
export function OrderStatusTimeline({
  status,
  cancelReason,
}: OrderStatusTimelineProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();

  if (status === 'cancelled') {
    return (
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
        <Chip icon="close-circle-outline" textStyle={{ color: theme.colors.error }}>
          {t('orderStatus.cancelled')}
        </Chip>
        {cancelReason === 'out_of_stock' ? (
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('pushBodies.orderOutOfStockReason')}
          </Text>
        ) : null}
      </View>
    );
  }

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <View style={{ paddingVertical: 4 }}>
      {STEPS.map((step, index) => {
        const filled = index <= currentIndex;
        const isLast = index === STEPS.length - 1;
        return (
          <View key={step} style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: filled ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: filled ? theme.colors.primary : 'transparent',
                }}
              />
              {!isLast ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 18,
                    backgroundColor:
                      index < currentIndex ? theme.colors.primary : theme.colors.outlineVariant,
                  }}
                />
              ) : null}
            </View>
            <Text
              variant="bodyMedium"
              style={{
                marginLeft: 8,
                marginBottom: isLast ? 0 : 12,
                fontWeight: filled ? '700' : '400',
                opacity: filled ? 1 : 0.5,
              }}
            >
              {t(STEP_LABEL[step])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
