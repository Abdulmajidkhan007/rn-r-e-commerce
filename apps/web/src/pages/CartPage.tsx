import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppDispatch, useAppSelector, updateQty, removeItem } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { Card, PriceTag, QuantityStepper } from '@/components';

export default function CartPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const items = useAppSelector((s) => s.cart.items);
  const language = useAppSelector((s) => s.ui.language);

  const totals = computeOrderTotals(items);

  if (items.length === 0) {
    return (
      <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
        <Typography variant="h5">{t('cart.emptyCart')}</Typography>
        <Button component={RouterLink} to="/catalog" variant="contained">
          {t('cart.continueShopping')}
        </Button>
      </Stack>
    );
  }

  const goCheckout = (): void => {
    if (isAuthenticated) navigate('/checkout');
    else navigate('/login', { replace: true, state: { from: '/checkout' } });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('cart.cart')}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1.5} sx={{ flexGrow: 1, width: '100%' }}>
          {items.map((item) => (
            <Card key={`${item.productId}-${item.size}-${item.color}`}>
              <Stack direction="row" spacing={2}>
                <Box
                  component="img"
                  src={item.image}
                  alt={item.name}
                  sx={{
                    width: 72,
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                />
                <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.size} · {item.color}
                  </Typography>
                  <PriceTag price={item.price} size="sm" />
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(q) =>
                        dispatch(
                          updateQty({
                            productId: item.productId,
                            size: item.size,
                            color: item.color,
                            quantity: q,
                          }),
                        )
                      }
                      min={1}
                      max={99}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={t('cart.remove')}
                      onClick={() =>
                        dispatch(
                          removeItem({
                            productId: item.productId,
                            size: item.size,
                            color: item.color,
                          }),
                        )
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>

        <Card className="cart-summary">
          <Stack spacing={1.5} sx={{ minWidth: { md: 280 } }}>
            <Typography variant="h6">{t('checkout.orderSummary')}</Typography>
            <Row label={t('cart.subtotal')} value={formatPrice(totals.subtotal, language)} />
            <Row label={t('cart.deposit')} value={formatPrice(totals.depositAmount, language)} />
            <Typography variant="caption" color="text.secondary">
              {t('cart.depositNote')}
            </Typography>
            <Divider />
            <Row label={t('cart.total')} value={formatPrice(totals.total, language)} strong />
            <Button variant="contained" size="large" onClick={goCheckout}>
              {t('cart.checkout')}
            </Button>
          </Stack>
        </Card>
      </Stack>
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
