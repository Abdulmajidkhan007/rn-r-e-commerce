import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import type { OrderStatus } from '@kidswear/core';
import { useAllOrders, useUpdateOrderStatus } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice, formatDateTime } from '@kidswear/utils';
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

export default function AdminOrdersPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const { orders, loading } = useAllOrders(filter || undefined);
  const updateStatus = useUpdateOrderStatus();
  const [saved, setSaved] = useState(false);

  const onChangeStatus = (id: string, status: OrderStatus): void => {
    updateStatus.mutate({ id, status }, { onSuccess: () => setSaved(true) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('adminOrders.allOrders')}
      </Typography>

      <TextField
        select
        label={t('adminOrders.filterByStatus')}
        size="small"
        value={filter}
        onChange={(e) => setFilter(e.target.value as OrderStatus | '')}
        sx={{ minWidth: 220, alignSelf: 'flex-start' }}
      >
        <MenuItem value="">{t('adminOrders.all')}</MenuItem>
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {t(STATUS_LABEL[s])}
          </MenuItem>
        ))}
      </TextField>

      {loading ? (
        <CircularProgress />
      ) : orders.length === 0 ? (
        <Typography color="text.secondary">{t('adminOrders.noOrders')}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('adminOrders.orderId')}</TableCell>
              <TableCell>{t('orders.orderDate')}</TableCell>
              <TableCell>{t('adminOrders.customer')}</TableCell>
              <TableCell align="right">{t('adminOrders.total')}</TableCell>
              <TableCell>{t('admin.active')}</TableCell>
              <TableCell>{t('adminOrders.updateStatus')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell>{o.id.slice(0, 8)}</TableCell>
                <TableCell>{formatDateTime(o.createdAt, language)}</TableCell>
                <TableCell>{o.shippingAddress.fullName}</TableCell>
                <TableCell align="right">{formatPrice(o.total, language)}</TableCell>
                <TableCell>
                  <OrderStatusChip status={o.status} />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={o.status}
                    onChange={(e) => onChangeStatus(o.id, e.target.value as OrderStatus)}
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {t(STATUS_LABEL[s])}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message={t('adminOrders.statusUpdated')}
      />
    </Stack>
  );
}
