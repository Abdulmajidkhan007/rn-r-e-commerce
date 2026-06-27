import { Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Divider, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector, updateQty, removeItem } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { PriceTag, QuantityStepper } from '@/components';

export default function CartScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const items = useAppSelector((s) => s.cart.items);
  const language = useAppSelector((s) => s.ui.language);

  const totals = computeOrderTotals(items);

  if (items.length === 0) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}
      >
        <Text variant="titleMedium">{t('cart.emptyCart')}</Text>
        <Button mode="contained" onPress={() => router.push('/catalog')}>
          {t('cart.continueShopping')}
        </Button>
      </View>
    );
  }

  const goCheckout = (): void => {
    router.push(isAuthenticated ? '/checkout' : '/(auth)/login');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
      {items.map((item) => (
        <Card key={`${item.productId}-${item.size}-${item.color}`} mode="outlined">
          <Card.Content style={{ flexDirection: 'row', gap: 12 }}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={{ width: 64, height: 84, borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="titleSmall" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                {item.size} · {item.color}
              </Text>
              <PriceTag price={item.price} size="sm" />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                  icon="delete"
                  size={20}
                  accessibilityLabel={t('cart.remove')}
                  onPress={() =>
                    dispatch(
                      removeItem({
                        productId: item.productId,
                        size: item.size,
                        color: item.color,
                      }),
                    )
                  }
                />
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}

      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <Row label={t('cart.subtotal')} value={formatPrice(totals.subtotal, language)} />
          <Row label={t('cart.deposit')} value={formatPrice(totals.depositAmount, language)} />
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {t('cart.depositNote')}
          </Text>
          <Divider />
          <Row label={t('cart.total')} value={formatPrice(totals.total, language)} strong />
          <Button mode="contained" onPress={goCheckout}>
            {t('cart.checkout')}
          </Button>
        </Card.Content>
      </Card>
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
      <Text variant={strong ? 'titleMedium' : 'bodyMedium'} style={{ opacity: strong ? 1 : 0.7 }}>
        {label}
      </Text>
      <Text
        variant={strong ? 'titleMedium' : 'bodyMedium'}
        style={{ fontWeight: strong ? '800' : '400' }}
      >
        {value}
      </Text>
    </View>
  );
}
