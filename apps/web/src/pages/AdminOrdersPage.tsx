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
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReceiptIcon from '@mui/icons-material/Receipt';
import type { Order, OrderStatus } from '@kidswear/core';
import { useAuth } from '@kidswear/auth';
import {
  stockErrorMessage,
  useAllOrders,
  usePendingReceiptCounts,
  useUpdateOrderStatus,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice, formatDateTime } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { ReceiptReviewDialog } from '@/components/admin/ReceiptReviewDialog';

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
  const tk = (key: string, params?: Record<string, string>): string =>
    t(key, { defaultValue: key, ...params });
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const { orders, loading } = useAllOrders(filter || undefined);
  const { user } = useAuth();
  const updateStatus = useUpdateOrderStatus();
  const [notice, setNotice] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );
  const pendingReceipts = usePendingReceiptCounts(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  // Looked up from the live list so the dialog follows the order's status.
  const reviewOrder: Order | null = orders.find((o) => o.id === reviewId) ?? null;

  // The status write runs in the stock transaction: a shortfall aborts it and
  // the select snaps back to the stored status (the live snapshot never moved).
  const onChangeStatus = (id: string, status: OrderStatus): void => {
    if (!user) return;
    updateStatus.mutate(
      { id, status, by: user.uid },
      {
        onSuccess: ({ action }) =>
          setNotice({
            severity: 'success',
            text:
              action === 'apply'
                ? t('adminOrders.stockTaken')
                : action === 'return'
                  ? t('adminOrders.stockReturned')
                  : t('adminOrders.statusUpdated'),
          }),
        onError: (error) => {
          const msg = stockErrorMessage(
            error,
            orders.find((o) => o.id === id),
          );
          setNotice({ severity: 'error', text: tk(msg.key, msg.params) });
        },
      },
    );
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
          <TableSkeleton rows={6} columns={7} />
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
                <TableCell sx={{ fontWeight: 700 }}>{t('receipts.reviewTitle')}</TableCell>
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
                        disabled={updateStatus.isPending}
                        inputProps={{ 'aria-label': `${t('adminOrders.updateStatus')} ${o.id}` }}
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
                  <TableCell>
                    {o.payment?.provider === 'transfer' && (
                      <Badge
                        color="error"
                        badgeContent={pendingReceipts.get(o.id) ?? 0}
                        aria-label={t('receipts.pendingBadge', {
                          count: pendingReceipts.get(o.id) ?? 0,
                        })}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ReceiptIcon />}
                          onClick={() => setReviewId(o.id)}
                          data-testid={`receipts-${o.id}`}
                        >
                          {t('receipts.reviewTitle')}
                        </Button>
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {user && (
        <ReceiptReviewDialog
          order={reviewOrder}
          adminUid={user.uid}
          language={language}
          onClose={() => setReviewId(null)}
          onDone={(text) => setNotice({ severity: 'success', text })}
        />
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={notice?.severity === 'error' ? 6000 : 2500}
        onClose={() => setNotice(null)}
      >
        <Alert
          severity={notice?.severity ?? 'success'}
          variant="filled"
          onClose={() => setNotice(null)}
          data-testid="order-status-notice"
        >
          {notice?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
