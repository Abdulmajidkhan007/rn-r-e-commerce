import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { OrderStatus } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';

const STEPS = ['pending', 'deposit_paid', 'processing', 'shipped', 'delivered'] as const;

const STEP_LABEL = {
  pending: 'orderStatus.pending',
  deposit_paid: 'orderStatus.deposit_paid',
  processing: 'orderStatus.processing',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
} as const;

export interface OrderStatusTimelineProps {
  status: OrderStatus;
  cancelReason?: string;
}

/** Horizontal (desktop) / vertical (mobile) 5-step order-progress timeline. */
export function OrderStatusTimeline({
  status,
  cancelReason,
}: OrderStatusTimelineProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  if (status === 'cancelled') {
    return (
      <Stack spacing={1} sx={{ alignItems: 'center', py: 2 }}>
        <Chip color="error" label={t('orderStatus.cancelled')} />
        {cancelReason === 'out_of_stock' && (
          <Typography variant="body2" color="text.secondary">
            {t('orders.outOfStockReason', { defaultValue: 'Mahsulot omborda qolmagan' })}
          </Typography>
        )}
      </Stack>
    );
  }

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  const dotSx = (filled: boolean): SxProps<Theme> => ({
    width: tokens.spacing.md,
    height: tokens.spacing.md,
    borderRadius: `${tokens.radii.full}px`,
    flexShrink: 0,
    bgcolor: filled ? 'primary.main' : 'transparent',
    border: '2px solid',
    borderColor: filled ? 'primary.main' : 'text.disabled',
    transition: theme.transitions.create(['background-color', 'border-color'], {
      duration: tokens.durations.fast,
      easing: tokens.easings.standard,
    }),
  });

  if (isCompact) {
    return (
      <Stack spacing={2} sx={{ py: 1 }}>
        {STEPS.map((step, index) => {
          const filled = index <= currentIndex;
          return (
            <Stack key={step} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={dotSx(filled)} />
              <Typography
                variant="body2"
                color={filled ? 'text.primary' : 'text.disabled'}
                sx={{ fontWeight: filled ? 700 : 400 }}
              >
                {t(STEP_LABEL[step])}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack direction="row" sx={{ width: '100%', py: 1 }}>
      {STEPS.map((step, index) => {
        const filled = index <= currentIndex;
        return (
          <Box
            key={step}
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  bgcolor: index > 0 && index <= currentIndex ? 'primary.main' : 'divider',
                  visibility: index === 0 ? 'hidden' : 'visible',
                }}
              />
              <Box sx={dotSx(filled)} />
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  bgcolor: index < currentIndex ? 'primary.main' : 'divider',
                  visibility: index === STEPS.length - 1 ? 'hidden' : 'visible',
                }}
              />
            </Stack>
            <Typography
              variant="caption"
              color={filled ? 'text.primary' : 'text.disabled'}
              sx={{ mt: 1, textAlign: 'center', fontWeight: filled ? 700 : 400 }}
            >
              {t(STEP_LABEL[step])}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
