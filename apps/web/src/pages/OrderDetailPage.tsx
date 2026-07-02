import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useOrder, useCancelOrder } from '@kidswear/data';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { Card, Skeleton } from '@/components';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';

export default function OrderDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const language = useAppSelector((s) => s.ui.language);
  const { order, loading } = useOrder(id);
  const { cancel, isPending } = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (loading) {
    return (
      <Container disableGutters maxWidth={false} sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2, mt: 4 }} />
      </Container>
    );
  }
  if (!order) {
    return (
      <Container disableGutters maxWidth={false} sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="h5">404</Typography>
          <Typography color="text.secondary">{t('orders.noOrders')}</Typography>
        </Box>
      </Container>
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
    <Container disableGutters maxWidth={false} sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 } }}>
      <Stack spacing={3} sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
              #{order.id.slice(0, 8)}
            </Typography>
            <OrderStatusChip status={order.status} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {formatDate(order.createdAt, language)}
          </Typography>
        </Stack>

        <Card>
          <OrderStatusTimeline status={order.status} />
        </Card>

        <Card>
          <Stack spacing={1.5}>
            <Typography variant="h6">{t('orders.items')}</Typography>
            {order.items.map((item) => (
              <Stack
                key={`${item.productId}-${item.size}-${item.color}`}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                {item.image ? (
                  <Box
                    component="img"
                    src={item.image}
                    alt={item.name}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      objectFit: 'cover',
                      bgcolor: 'action.hover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: 'action.hover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.quantity} × {formatPrice(item.price, language)} ({item.size}/{item.color})
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatPrice(item.price * item.quantity, language)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>

        <Card>
          <Stack spacing={1}>
            <Row label={t('cart.subtotal')} value={formatPrice(order.subtotal, language)} />
            <Row label={t('cart.deposit')} value={formatPrice(order.depositAmount, language)} strong />
            <Row label={t('orders.paid')} value={formatPrice(order.paidAmount, language)} />
            <Row label={t('cart.remaining')} value={formatPrice(remaining, language)} />
            <Divider />
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
            size="small"
            color="error"
            variant="outlined"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
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
    </Container>
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
