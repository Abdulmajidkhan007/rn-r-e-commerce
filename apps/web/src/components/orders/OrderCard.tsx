import { Link as RouterLink } from 'react-router-dom';
import MuiCard from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { Order } from '@kidswear/core';
import { formatDate } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { PriceTag } from '@/components';
import { OrderStatusChip } from './OrderStatusChip';

/** Clickable order summary card used in the orders list. */
export function OrderCard({ order }: { order: Order }): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const count = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <MuiCard
      variant="outlined"
      sx={{
        boxShadow: 'none',
        transition: theme.transitions.create(['border-color', 'transform'], {
          duration: tokens.durations.fast,
          easing: tokens.easings.standard,
        }),
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea component={RouterLink} to={`/orders/${order.id}`}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                #{order.id.slice(0, 8)}
              </Typography>
              <OrderStatusChip status={order.status} />
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(order.createdAt, language)} · {count} {t('orders.items')}
              </Typography>
              <PriceTag price={order.total} size="sm" />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </MuiCard>
  );
}
