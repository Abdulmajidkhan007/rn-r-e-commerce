import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { deliveryText, freeDeliveryRemaining, type DeliverySettings } from '@kidswear/core';
import { formatPrice } from '@kidswear/utils';
import type { SupportedLanguage } from '@kidswear/i18n';
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
  const text = deliveryText(settings, language, (som) => formatPrice(som, language), amount);
  const freeLeft = freeDeliveryRemaining(settings, amount);
  if (freeLeft === null && text.min === null) return null;

  const freeFrom = settings?.freeFrom ?? 0;
  const progress = freeFrom > 0 ? Math.min(100, (amount / freeFrom) * 100) : 0;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {text.min !== null && (
        <Alert severity="warning" data-testid="min-order-notice">
          {text.min}
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
                {text.free}
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
