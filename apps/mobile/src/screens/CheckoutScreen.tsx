import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Divider, HelperText, RadioButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector, clearCart } from '@kidswear/store';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { useCheckout } from '@kidswear/data';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { AddressDialog } from '@/components/profile/AddressDialog';
import { useTranslateKey } from '@/lib/useTranslateKey';
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
  const { checkout, isPending, error } = useCheckout();

  const [selectedId, setSelectedId] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);

  const needsAuth = status !== 'idle' && !isAuthenticated;
  const cartEmpty = items.length === 0;

  useEffect(() => {
    if (needsAuth) {
      navigation.navigate('Login');
    }
  }, [needsAuth, navigation]);

  useEffect(() => {
    if (cartEmpty) {
      navigation.navigate('Tabs', { screen: 'Cart' });
    }
  }, [cartEmpty, navigation]);

  if (needsAuth) return <View style={{ flex: 1 }} />;
  if (cartEmpty) return <View style={{ flex: 1 }} />;

  const addresses = user?.addresses ?? [];
  const effectiveId = selectedId || addresses[0]?.id || '';
  const selected = addresses.find((a) => a.id === effectiveId) ?? null;
  const totals = computeOrderTotals(items);

  const handleAdd = (values: AddressFormValues): Promise<boolean> => addAddress(values);

  const placeOrder = async (): Promise<void> => {
    if (!user || !selected) return;
    try {
      const { orderId } = await checkout({ userId: user.uid, items, shippingAddress: selected });
      dispatch(clearCart());
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
                  label={`${a.fullName} — ${a.region}, ${a.district}`}
                />
              ))}
            </RadioButton.Group>
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">{t('checkout.paymentMethod')}</Text>
          <Text variant="bodySmall">{t('checkout.depositMock')}</Text>
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
