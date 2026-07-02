import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAuth } from '@kidswear/auth';
import { useUserOrders } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { OrderCard } from '@/components/orders/OrderCard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function OrdersPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('orders.myOrders'));
  const { user } = useAuth();
  const { orders, loading } = useUserOrders(user?.uid);

  return (
    <Container disableGutters maxWidth={false} sx={{ maxWidth: 1024, mx: 'auto', px: { xs: 2, md: 4 } }}>
      <Stack spacing={3} sx={{ py: { xs: 3, md: 5 } }}>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
          {t('orders.myOrders')}
        </Typography>

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : orders.length === 0 ? (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 6, md: 10 } }}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}>
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <rect
                  x="24"
                  y="12"
                  width="48"
                  height="64"
                  rx="6"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M33 30h30M33 44h30M33 58h18"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M24 76l6-8 6 8 6-8 6 8 6-8 6 8 6-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('orders.noOrders', { defaultValue: "Buyurtmalar hali yo'q" })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
              {t('orders.noOrdersBody', {
                defaultValue: "Katalogni ko'rib chiqing va birinchi buyurtmangizni bering.",
              })}
            </Typography>
            <Button component={RouterLink} to="/catalog" variant="contained">
              {t('nav.catalog', { defaultValue: 'Katalog' })}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
