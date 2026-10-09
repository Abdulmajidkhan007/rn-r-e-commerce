import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Divider, HelperText, RadioButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector, clearCart } from '@kidswear/store';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { deliveryFeeFor, evaluatePromo, type PaymentProvider } from '@kidswear/core';
import { availableProviders, useCheckout, useDeliverySettings } from '@kidswear/data';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { AddressDialog } from '@/components/profile/AddressDialog';
import { PromoCodeField, type AppliedPromo } from '@/components/checkout/PromoCodeField';
import { regionLabel } from '@/lib/region';
import { useNow } from '@/lib/useNow';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { checkoutReturnUrl, paymentProviders } from '@/payments';
import type { RootStackParamList } from '@/navigation/types';

export function CheckoutScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, status } = useAuth();
  const items = useAppSelector((s) => s.cart.items);
  const language = useAppSelector((s) => s.ui.language);
  const { addAddress, saving } = useAddressActions();
  const { checkout, isPending, error } = useCheckout({ providers: paymentProviders });

  // 'mock' stays available so the flow works before any gateway contract is
  // signed; a configured gateway takes precedence as the default.
  const providers = useMemo<PaymentProvider[]>(() => {
    const hosted = availableProviders(paymentProviders);
    return hosted.length > 0 ? hosted : ['mock'];
  }, []);
  const [provider, setProvider] = useState<PaymentProvider>(() => providers[0] ?? 'mock');

  const [selectedId, setSelectedId] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const { data: delivery } = useDeliverySettings();
  const now = useNow();
  // Set when an order went through, so clearing the cart does not bounce the
  // customer to the Cart tab instead of the success screen.
  const placedRef = useRef(false);

  const needsAuth = status !== 'idle' && !isAuthenticated;
  const cartEmpty = items.length === 0;

  useEffect(() => {
    if (needsAuth) {
      navigation.navigate('Login');
    }
  }, [needsAuth, navigation]);

  useEffect(() => {
    if (cartEmpty && !placedRef.current) {
      navigation.navigate('Tabs', { screen: 'Cart' });
    }
  }, [cartEmpty, navigation]);

  if (needsAuth) return <View style={{ flex: 1 }} />;
  if (cartEmpty) return <View style={{ flex: 1 }} />;

  const addresses = user?.addresses ?? [];
  const effectiveId = selectedId || addresses[0]?.id || '';
  const selected = addresses.find((a) => a.id === effectiveId) ?? null;
  // Same arithmetic as useCheckout and the Firestore rules.
  const subtotal = computeOrderTotals(items).subtotal;
  const promoResult = promo ? evaluatePromo(promo.promo, subtotal, now) : null;
  const discount = promoResult?.ok ? promoResult.discount : 0;
  const deliveryFee = selected ? deliveryFeeFor(delivery, selected.region, subtotal - discount) : 0;
  const totals = computeOrderTotals(items, { discount, deliveryFee });

  const handleAdd = (values: AddressFormValues): Promise<boolean> => addAddress(values);

  const placeOrder = async (): Promise<void> => {
    if (!user || !selected) return;
    try {
      const { orderId, checkoutUrl } = await checkout({
        userId: user.uid,
        items,
        shippingAddress: selected,
        provider,
        returnUrl: checkoutReturnUrl,
        ...(promo && discount > 0 ? { promoCode: promo.code } : {}),
      });
      placedRef.current = true;
      dispatch(clearCart());

      if (checkoutUrl) {
        // Hosted gateway: hand off to the browser. The order stays 'pending'
        // until their webhook confirms it, and the orders screen — which is a
        // live snapshot listener — reflects that without any polling here.
        await Linking.openURL(checkoutUrl);
        navigation.replace('Orders');
        return;
      }
      navigation.replace('CheckoutSuccess', { orderId });
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      {error ? (
        <HelperText type="error" visible>
          {tk(error)}
        </HelperText>
      ) : null}

      <Card mode="outlined">
        <Card.Content style={{ gap: 6 }}>
          <Text variant="titleMedium">{t('checkout.orderSummary')}</Text>
          {items.map((item) => (
            <View
              key={`${item.productId}-${item.size}-${item.color}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {item.name} × {item.quantity}
              </Text>
              <Text variant="bodySmall">{formatPrice(item.price * item.quantity, language)}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 4 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text variant="titleMedium">{t('checkout.shippingAddress')}</Text>
            <Button compact onPress={() => setDialogVisible(true)}>
              {t('checkout.addNewAddress')}
            </Button>
          </View>
          {addresses.length === 0 ? (
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {t('checkout.selectAddress')}
            </Text>
          ) : (
            <RadioButton.Group onValueChange={setSelectedId} value={effectiveId}>
              {addresses.map((a) => (
                <RadioButton.Item
                  key={a.id}
                  value={a.id}
                  label={`${a.fullName} — ${regionLabel(a.region, language)}, ${a.district}`}
                />
              ))}
            </RadioButton.Group>
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">{t('promo.title')}</Text>
          <PromoCodeField subtotal={subtotal} applied={promo} onChange={setPromo} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">{t('checkout.paymentMethod')}</Text>
          <Text variant="bodySmall">{t('payment.depositNote')}</Text>

          {/* Only shown when there is an actual choice to make. */}
          {providers.length > 1 ? (
            <RadioButton.Group
              onValueChange={(v) => setProvider(v as PaymentProvider)}
              value={provider}
            >
              {providers.map((p) => (
                <RadioButton.Item key={p} value={p} label={t(`payment.${p}`)} />
              ))}
            </RadioButton.Group>
          ) : null}

          <Divider />
          <Row label={t('cart.subtotal')} value={formatPrice(totals.subtotal, language)} />
          {totals.discount > 0 ? (
            <Row
              label={t('promo.discount')}
              value={`− ${formatPrice(totals.discount, language)}`}
            />
          ) : null}
          <Row
            label={t('delivery.fee')}
            value={
              totals.deliveryFee > 0
                ? formatPrice(totals.deliveryFee, language)
                : t('delivery.free')
            }
          />
          <Row label={t('cart.total')} value={formatPrice(totals.total, language)} />
          <Row
            label={t('checkout.dueNow')}
            value={formatPrice(totals.depositAmount, language)}
            strong
          />
          <Row
            label={t('checkout.dueOnDelivery')}
            value={formatPrice(totals.total - totals.depositAmount, language)}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        loading={isPending}
        disabled={isPending || !selected}
        onPress={() => void placeOrder()}
      >
        {t('checkout.placeOrder')}
      </Button>

      <AddressDialog
        visible={dialogVisible}
        saving={saving}
        onDismiss={() => setDialogVisible(false)}
        onSubmit={handleAdd}
      />
    </ScrollView>
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="bodyMedium" style={{ opacity: strong ? 1 : 0.7 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: strong ? '800' : '400' }}>
        {value}
      </Text>
    </View>
  );
}
