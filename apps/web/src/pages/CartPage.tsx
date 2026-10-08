import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector, updateQty, removeItem } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { computeOrderTotals } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { CartLine } from '@/components/cart/CartLine';
import { EmptyCart } from '@/components/cart/EmptyCart';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CartPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('cart.cart'));
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const items = useAppSelector((s) => s.cart.items);
  const language = useAppSelector((s) => s.ui.language);

  const totals = computeOrderTotals(items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;

  const goCheckout = (): void => {
    if (isAuthenticated) navigate('/checkout');
    else navigate('/login', { replace: true, state: { from: '/checkout' } });
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        pb: hasItems ? { xs: 14, md: 4 } : 4,
      }}
    >
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h1">{t('cart.cart')}</Typography>
        {hasItems && (
          <Typography variant="body2" color="text.secondary">
            {t('cart.itemsCount', { count: itemCount, defaultValue: '{{count}} ta mahsulot' })}
          </Typography>
        )}
      </Stack>

      {!hasItems ? (
        <EmptyCart />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 380px' },
            gap: 4,
            alignItems: 'flex-start',
          }}
        >
          <Stack sx={{ width: '100%' }}>
            {items.map((item) => (
              <CartLine
                key={`${item.productId}-${item.size}-${item.color}`}
                item={item}
                language={language}
                onQtyChange={(quantity) =>
                  dispatch(
                    updateQty({
                      productId: item.productId,
                      size: item.size,
                      color: item.color,
                      quantity,
                    }),
                  )
                }
                onRemove={() =>
                  dispatch(
                    removeItem({
                      productId: item.productId,
                      size: item.size,
                      color: item.color,
                    }),
                  )
                }
              />
            ))}
          </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 96 }}>
            <OrderSummary mode="cart" totals={totals} language={language} onCheckout={goCheckout} />
          </Box>
        </Box>
      )}

      {hasItems && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            px: 2,
            py: 1.5,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: tokens.elevations.lg.shadow,
            zIndex: theme.zIndex.appBar,
          }}
        >
          <OrderSummary
            compact
            mode="cart"
            totals={totals}
            language={language}
            onCheckout={goCheckout}
          />
        </Box>
      )}
    </Box>
  );
}
