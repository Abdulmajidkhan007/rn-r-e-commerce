import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import { useOrder, useCancelOrder } from '@kidswear/data';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { Card, Skeleton } from '@/components';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';

export default function OrderDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const language = useAppSelector((s) => s.ui.language);
  const { order, loading } = useOrder(id);
  const { cancel, isPending } = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />;
  }
  if (!order) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h5">404</Typography>
        <Typography color="text.secondary">{t('orders.noOrders')}</Typography>
      </Box>
    );
  }

  const canCancel = order.status === 'pending' || order.status === 'deposit_paid';
  const remaining = order.total - order.paidAmount;
  const addr = order.shippingAddress;

  const doCancel = async (): Promise<void> => {
    await cancel(order.id);
    setConfirmOpen(false);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, flexGrow: 1 }}>
          {formatDate(order.createdAt, language)}
        </Typography>
        <OrderStatusChip status={order.status} />
      </Stack>

      <Card>
        <Stack spacing={1}>
          {order.items.map((item) => (
            <Stack
              key={`${item.productId}-${item.size}-${item.color}`}
              direction="row"
              sx={{ justifyContent: 'space-between' }}
            >
              <Typography variant="body2">
                {item.name} × {item.quantity} ({item.size}/{item.color})
              </Typography>
              <Typography variant="body2">
                {formatPrice(item.price * item.quantity, language)}
              </Typography>
            </Stack>
          ))}
          <Divider />
          <Row label={t('cart.subtotal')} value={formatPrice(order.subtotal, language)} />
          <Row label={t('orders.paid')} value={formatPrice(order.paidAmount, language)} />
          <Row label={t('cart.remaining')} value={formatPrice(remaining, language)} />
          <Row label={t('cart.total')} value={formatPrice(order.total, language)} strong />
        </Stack>
      </Card>

      <Card>
        <Stack spacing={0.5}>
          <Typography variant="h6">{t('checkout.shippingAddress')}</Typography>
          <Typography variant="body2">{addr.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {addr.region}, {addr.district}, {addr.street}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {addr.phone}
          </Typography>
        </Stack>
      </Card>

      {canCancel && (
        <Button
          color="error"
          variant="outlined"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {t('orders.cancelOrder')}
        </Button>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('orders.confirmCancel')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('actions.cancel')}</Button>
          <Button color="error" disabled={isPending} onClick={() => void doCancel()}>
            {t('orders.cancelOrder')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
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
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography
        variant={strong ? 'subtitle1' : 'body2'}
        color={strong ? 'text.primary' : 'text.secondary'}
      >
        {label}
      </Typography>
      <Typography variant={strong ? 'subtitle1' : 'body2'} sx={{ fontWeight: strong ? 700 : 400 }}>
        {value}
      </Typography>
    </Stack>
  );
}
