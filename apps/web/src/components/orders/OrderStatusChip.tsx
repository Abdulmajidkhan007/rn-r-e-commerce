import Chip from '@mui/material/Chip';
import type { OrderStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

const COLOR: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  deposit_paid: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

const LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
} as const;

export function OrderStatusChip({ status }: { status: OrderStatus }): React.ReactElement {
  const { t } = useTranslation();
  return <Chip size="small" color={COLOR[status]} label={t(LABEL[status])} />;
}
