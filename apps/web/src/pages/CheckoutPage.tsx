import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useAppDispatch, useAppSelector, clearCart } from '@kidswear/store';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { useCheckout } from '@kidswear/data';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';
import { AddressDialog } from '@/components/profile/AddressDialog';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CheckoutPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('checkout.placeOrder'));
  const tk = useTranslateKey();
  const navigate = useNavigate();
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
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('cart.checkout')}
      </Typography>

      {error && <Alert severity="error">{tk(error)}</Alert>}

      <Card>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('checkout.orderSummary')}</Typography>
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
      </Card>

      <Card>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('checkout.shippingAddress')}</Typography>
            <Button size="small" onClick={() => setDialogOpen(true)}>
              {t('checkout.addNewAddress')}
            </Button>
          </Stack>
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

      <Card>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('checkout.paymentMethod')}</Typography>
          <Typography variant="body2">{t('checkout.depositMock')}</Typography>
          <Divider />
          <Row label={t('cart.subtotal')} value={formatPrice(totals.subtotal, language)} />
          <Row
            label={t('checkout.dueNow')}
            value={formatPrice(totals.depositAmount, language)}
            strong
          />
          <Row
            label={t('checkout.dueOnDelivery')}
            value={formatPrice(totals.total - totals.depositAmount, language)}
          />
        </Stack>
      </Card>

      <Button
        variant="contained"
        size="large"
        disabled={isPending || !selected || items.length === 0}
        onClick={() => void placeOrder()}
      >
        {isPending ? t('checkout.processing') : t('checkout.placeOrder')}
      </Button>

      <AddressDialog
        open={dialogOpen}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddAddress}
      />
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
