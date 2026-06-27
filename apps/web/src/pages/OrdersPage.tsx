import { Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import { useAuth } from '@kidswear/auth';
import { useUserOrders } from '@kidswear/data';
import { formatDate, formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { Card, Skeleton } from '@/components';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';

export default function OrdersPage(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const language = useAppSelector((s) => s.ui.language);
  const { orders, loading } = useUserOrders(user?.uid);

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('orders.myOrders')}
      </Typography>

      {loading ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
        </Stack>
      ) : orders.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('orders.noOrders')}</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {orders.map((order) => {
            const count = order.items.reduce((n, i) => n + i.quantity, 0);
            const remaining = order.total - order.paidAmount;
            return (
              <Card key={order.id} padded={false}>
                <CardActionArea component={RouterLink} to={`/orders/${order.id}`} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt, language)}
                      </Typography>
                      <OrderStatusChip status={order.status} />
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {count} {t('orders.items')}
                      </Typography>
                      <Typography variant="subtitle2">
                        {formatPrice(order.total, language)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('orders.paid')}: {formatPrice(order.paidAmount, language)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('cart.remaining')}: {formatPrice(remaining, language)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
