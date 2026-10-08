import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import { alpha, useTheme } from '@mui/material/styles';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { OrderStatus } from '@kidswear/core';
import { useAllOrders, useUpdateOrderStatus } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice, formatDateTime } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

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
  const theme = useTheme();
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
      <Box>
        <Typography variant="h2">{t('adminOrders.allOrders')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('adminOrders.orderCount', { count: orders.length, defaultValue: '{{count}} orders' })}
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ p: 2, alignSelf: 'flex-start' }}>
        <TextField
          select
          label={t('adminOrders.filterByStatus')}
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | '')}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">{t('adminOrders.all')}</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {t(STATUS_LABEL[s])}
            </MenuItem>
          ))}
        </TextField>
      </Card>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : orders.length === 0 ? (
          <EmptyState title={t('adminOrders.noOrders')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('adminOrders.orderId')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('orders.orderDate')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('adminOrders.customer')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('adminOrders.total')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.active')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('adminOrders.updateStatus')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 1) } }}
                >
                  <TableCell>{o.id.slice(0, 8)}</TableCell>
                  <TableCell>{formatDateTime(o.createdAt, language)}</TableCell>
                  <TableCell>{o.shippingAddress.fullName}</TableCell>
                  <TableCell align="right">{formatPrice(o.total, language)}</TableCell>
                  <TableCell>
                    <OrderStatusChip status={o.status} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <EditOutlinedIcon
                        fontSize="small"
                        titleAccess={t('adminOrders.updateStatus')}
                        sx={{ color: 'text.secondary', fontSize: 16 }}
                      />
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
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message={t('adminOrders.statusUpdated')}
      />
    </Stack>
  );
}
