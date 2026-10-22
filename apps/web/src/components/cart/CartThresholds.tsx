import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { freeDeliveryRemaining, minOrderShortfall, type DeliverySettings } from '@kidswear/core';
import { formatPrice } from '@kidswear/utils';
import { useTranslation, type SupportedLanguage } from '@kidswear/i18n';
import { Card } from '@/components';

export interface CartThresholdsProps {
  settings: DeliverySettings | null | undefined;
  /** Goods amount after any discount — what both thresholds are measured on. */
  amount: number;
  language: SupportedLanguage;
}

/**
 * "X so'm more for free delivery" progress and the minimum-order notice.
 * Renders nothing when the shop has set neither threshold.
 */
export function CartThresholds({
  settings,
  amount,
  language,
}: CartThresholdsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const freeLeft = freeDeliveryRemaining(settings, amount);
  const minLeft = minOrderShortfall(settings, amount);
  if (freeLeft === null && minLeft === 0) return null;

  const freeFrom = settings?.freeFrom ?? 0;
  const progress = freeFrom > 0 ? Math.min(100, (amount / freeFrom) * 100) : 0;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {minLeft > 0 && (
        <Alert severity="warning" data-testid="min-order-notice">
          {t('cart.minOrderLeft', {
            min: formatPrice(settings?.minOrder ?? 0, language),
            amount: formatPrice(minLeft, language),
          })}
        </Alert>
      )}
      {freeLeft !== null && (
        <Card>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LocalShippingOutlinedIcon
                fontSize="small"
                color={freeLeft === 0 ? 'success' : 'primary'}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }} data-testid="free-delivery-left">
                {freeLeft === 0
                  ? t('cart.freeDeliveryReached')
                  : t('cart.freeDeliveryLeft', { amount: formatPrice(freeLeft, language) })}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={freeLeft === 0 ? 'success' : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
