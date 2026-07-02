import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import { useAppDispatch, useAppSelector, clearCart } from '@kidswear/store';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { useCheckout } from '@kidswear/data';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { Card } from '@/components';
import { AddressDialog } from '@/components/profile/AddressDialog';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CheckoutPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('checkout.placeOrder'));
  const tk = useTranslateKey();
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const items = useAppSelector((s) => s.cart.items);
  const language = useAppSelector((s) => s.ui.language);
  const { addAddress, saving } = useAddressActions();
  const { checkout, isPending, error } = useCheckout();

  const addresses = user?.addresses ?? [];
  const [selectedId, setSelectedId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Empty cart → back to cart.
  useEffect(() => {
    if (items.length === 0) navigate('/cart', { replace: true });
  }, [items.length, navigate]);

  const totals = computeOrderTotals(items);
  // Effective selection defaults to the first saved address (no effect needed).
  const effectiveId = selectedId || addresses[0]?.id || '';
  const selected = addresses.find((a) => a.id === effectiveId) ?? null;
  const placeDisabled = !selected || items.length === 0;

  const handleAddAddress = async (values: AddressFormValues): Promise<boolean> => {
    const ok = await addAddress(values);
    return ok;
  };

  const placeOrder = async (): Promise<void> => {
    if (!user || !selected) return;
    try {
      const { orderId } = await checkout({ userId: user.uid, items, shippingAddress: selected });
      dispatch(clearCart());
      navigate(`/checkout/success?orderId=${orderId}`, { replace: true });
    } catch {
      // error is surfaced via the `error` key below.
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, pb: { xs: 14, md: 4 } }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        {t('cart.checkout')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {tk(error)}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 380px' },
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        <Stack spacing={3}>
          {/* 1. Shipping address */}
          <Card>
            <Stack spacing={1.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('checkout.shippingAddress')}</Typography>
                <Button size="small" onClick={() => setDialogOpen(true)}>
                  {t('checkout.addNewAddress')}
                </Button>
              </Stack>
              {addresses.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t('checkout.selectAddress')}
                </Typography>
              )}
              {addresses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('checkout.selectAddress')}
                </Typography>
              ) : (
                <RadioGroup value={effectiveId} onChange={(e) => setSelectedId(e.target.value)}>
                  {addresses.map((a) => (
                    <FormControlLabel
                      key={a.id}
                      value={a.id}
                      control={<Radio />}
                      label={`${a.fullName} — ${a.region}, ${a.district}, ${a.street} (${a.phone})`}
                    />
                  ))}
                </RadioGroup>
              )}
            </Stack>
          </Card>

          {/* 2. Payment — stub */}
          <Card>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">{t('checkout.paymentMethod')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('checkout.depositMock')}
              </Typography>
              <Alert severity="info">
                {t('checkout.paymentComingSoon', {
                  defaultValue:
                    "To'liq to'lov integratsiyasi tez orada qo'shiladi. Hozircha oldindan to'lov summasi:",
                })}{' '}
                <strong>{formatPrice(totals.depositAmount, language)}</strong>
              </Alert>
            </Stack>
          </Card>

          {/* 3. Review */}
          <Card>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">{t('checkout.placeOrder')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('checkout.orderSummary')}
              </Typography>
              <Stack spacing={1}>
                {items.map((item) => (
                  <Stack
                    key={`${item.productId}-${item.size}-${item.color}`}
                    direction="row"
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2">
                      {item.name} × {item.quantity} ({item.size}/{item.color})
                    </Typography>
                    <Typography variant="body2">
                      {formatPrice(item.price * item.quantity, language)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 96 }}>
          <OrderSummary
            mode="checkout"
            totals={totals}
            language={language}
            onPlaceOrder={() => void placeOrder()}
            isPending={isPending}
            placeDisabled={placeDisabled}
          />
        </Box>
      </Box>

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
          mode="checkout"
          totals={totals}
          language={language}
          onPlaceOrder={() => void placeOrder()}
          isPending={isPending}
          placeDisabled={placeDisabled}
        />
      </Box>

      <AddressDialog
        open={dialogOpen}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddAddress}
      />
    </Box>
  );
}
