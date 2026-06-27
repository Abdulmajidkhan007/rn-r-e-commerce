import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';

export default function CheckoutSuccessPage(): React.ReactElement {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const orderId = params.get('orderId') ?? '';

  return (
    <Stack
      spacing={3}
      sx={{ maxWidth: 520, mx: 'auto', py: 4, alignItems: 'center', textAlign: 'center' }}
    >
      <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('checkout.orderPlaced')}
      </Typography>
      <Typography color="text.secondary">{t('checkout.orderConfirmation')}</Typography>

      {orderId && (
        <Card>
          <Typography variant="body2" color="text.secondary">
            {t('checkout.orderId')}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {orderId}
          </Typography>
        </Card>
      )}

      <Stack direction="row" spacing={2}>
        {orderId && (
          <Button component={RouterLink} to={`/orders/${orderId}`} variant="contained">
            {t('orders.viewOrder')}
          </Button>
        )}
        <Button component={RouterLink} to="/" variant="outlined">
          {t('checkout.backToHome')}
        </Button>
      </Stack>
    </Stack>
  );
}
