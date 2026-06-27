import { Chip } from 'react-native-paper';
import type { OrderStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

const LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

const ICON: Record<OrderStatus, string> = {
  pending: 'clock-outline',
  deposit_paid: 'cash-check',
  processing: 'progress-wrench',
  shipped: 'truck-delivery-outline',
  delivered: 'check-circle-outline',
  cancelled: 'close-circle-outline',
};

export function OrderStatusChip({ status }: { status: OrderStatus }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Chip compact icon={ICON[status]}>
      {t(LABEL[status])}
    </Chip>
  );
}
