import { Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector, updateQty, removeItem } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { computeOrderTotals, formatPrice } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { Card, PriceTag, QuantityStepper } from '@/components';

export default function CartScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
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
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing.md,
          padding: tokens.spacing.xl,
          paddingBottom: insets.bottom + tokens.spacing.xl,
        }}
      >
        <MaterialCommunityIcons name="shopping-outline" size={88} color={theme.colors.primary} />
        <Text variant="titleLarge" style={{ fontWeight: '800', textAlign: 'center' }}>
          {t('cart.emptyCart', { defaultValue: "Savatchangiz bo'sh" })}
        </Text>
        <Text style={{ opacity: 0.7, textAlign: 'center' }}>
          {t('cart.emptyHint', {
            defaultValue: "Sevimli mahsulotlaringizni tanlab, savatchaga qo'shing.",
          })}
        </Text>
        <Button mode="contained" onPress={() => router.push('/catalog')}>
          {t('cart.continueShopping', { defaultValue: 'Xarid qilishni davom ettirish' })}
        </Button>
      </View>
    );
  }

  const goCheckout = (): void => {
    router.push(isAuthenticated ? '/checkout' : '/(auth)/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing['6xl'],
        }}
      >
        <Text variant="headlineLarge" style={{ fontWeight: '800' }}>
          {t('cart.cart')}
        </Text>

        {items.map((item) => (
          <Card key={`${item.productId}-${item.size}-${item.color}`}>
            <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
              <Image
                source={{ uri: item.image }}
                style={{ width: 72, height: 92, borderRadius: tokens.radii.md }}
                resizeMode="cover"
              />
              <View style={{ flex: 1, gap: tokens.spacing.xs }}>
                <Text variant="titleSmall" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                  {item.size} · {item.color}
                </Text>
                <PriceTag price={item.price} size="sm" />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
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
                    icon="delete-outline"
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
            </View>
          </Card>
        ))}
      </ScrollView>

      <Surface
        elevation={tokens.elevations.lg.level}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing.md,
          borderTopLeftRadius: tokens.radii.lg,
          borderTopRightRadius: tokens.radii.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: tokens.spacing.xs,
          }}
        >
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('cart.subtotal')}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {formatPrice(totals.subtotal, language)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: tokens.spacing.md,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            {t('cart.deposit')}
          </Text>
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            {formatPrice(totals.depositAmount, language)}
          </Text>
        </View>
        <Button
          mode="contained"
          buttonColor={theme.colors.primary}
          onPress={goCheckout}
          style={{ width: '100%' }}
        >
          {t('cart.checkout')}
        </Button>
      </Surface>
    </View>
  );
}
