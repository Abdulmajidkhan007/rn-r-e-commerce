import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { formatPrice, type OrderTotals } from '@kidswear/utils';
import { useTranslation, type SupportedLanguage } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { Card } from '@/components';

export type OrderSummaryMode = 'cart' | 'checkout';

export interface OrderSummaryProps {
  totals: OrderTotals;
  language: SupportedLanguage;
  mode: OrderSummaryMode;
  /** mode="cart": go to /checkout (may redirect through /login first). */
  onCheckout?: () => void;
  /** mode="checkout": submit the order. */
  onPlaceOrder?: () => void;
  /** mode="checkout": true while `placeOrder` is in flight. */
  isPending?: boolean;
  /** mode="checkout": true when the CTA should be disabled (no address, etc). */
  placeDisabled?: boolean;
  /** Condensed single-row layout for the mobile sticky bar. */
  compact?: boolean;
}

/**
 * Order totals panel, shared by CartPage ("go to checkout" CTA) and
 * CheckoutPage ("place order" CTA). The 50% deposit is called out with a
 * tinted pill — it's the key visual differentiator of the checkout flow.
 */
export function OrderSummary({
  totals,
  language,
  mode,
  onCheckout,
  onPlaceOrder,
  isPending = false,
  placeDisabled = false,
  compact = false,
}: OrderSummaryProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const remaining = totals.total - totals.depositAmount;

  const ctaLabel =
    mode === 'cart'
      ? t('cart.checkout')
      : isPending
        ? t('checkout.processing')
        : t('checkout.placeOrder');
  const handleClick = mode === 'cart' ? onCheckout : onPlaceOrder;
  const disabled = mode === 'checkout' && (isPending || placeDisabled);

  if (compact) {
    return (
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.25}>
          <Chip
            label={t('cart.deposit')}
            color="primary"
            size="small"
            sx={{ width: 'fit-content' }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {formatPrice(totals.depositAmount, language)}
          </Typography>
        </Stack>
        <Button variant="contained" size="large" disabled={disabled} onClick={handleClick}>
          {ctaLabel}
        </Button>
      </Stack>
    );
  }

  return (
    <Card>
      <Stack spacing={2}>
        <Typography variant="h6">{t('checkout.orderSummary')}</Typography>

        <Row label={t('cart.subtotal')} value={formatPrice(totals.subtotal, language)} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            borderRadius: `${tokens.radii.md}px`,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {t('checkout.dueNow')}
            </Typography>
            <Chip
              label={t('cart.deposit')}
              color="primary"
              size="small"
              sx={{ width: 'fit-content' }}
            />
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {formatPrice(totals.depositAmount, language)}
          </Typography>
        </Box>

        <Row label={t('checkout.dueOnDelivery')} value={formatPrice(remaining, language)} />

        <Divider />

        <Row label={t('cart.total')} value={formatPrice(totals.total, language)} strong />

        <Typography variant="caption" color="text.secondary">
          {t('cart.depositNote')}
        </Typography>

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={disabled}
          onClick={handleClick}
        >
          {ctaLabel}
        </Button>
      </Stack>
    </Card>
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
