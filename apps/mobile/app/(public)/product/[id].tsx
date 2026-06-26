import { useState } from 'react';
import { Dimensions, Image, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Button, Chip, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProduct } from '@kidswear/data';
import { useAppDispatch, addItem } from '@kidswear/store';
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { PriceTag, QuantityStepper, Rating } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { useLocalized } from '@/lib/useLocalized';

const { width } = Dimensions.get('window');

export default function ProductScreen(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, isError, refetch } = useProduct(id);

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={{ opacity: 0.7 }}>{t('catalog.loadError')}</Text>
        <Button mode="contained" onPress={() => void refetch()}>
          {t('catalog.retry')}
        </Button>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text variant="headlineSmall">404</Text>
        <Text style={{ opacity: 0.7 }}>{t('catalog.noProducts')}</Text>
      </View>
    );
  }

  const status = stockStatus(product.stock);
  const needsSize = product.sizes.length > 0;
  const needsColor = product.colors.length > 0;
  const canAdd =
    status !== 'out' && (!needsSize || size !== null) && (!needsColor || color !== null);

  const handleAdd = (): void => {
    dispatch(
      addItem({
        productId: product.id,
        name: localized(product.name),
        image: product.images[0] ?? '',
        price: product.price,
        quantity: qty,
        size: size ?? '',
        color: color ?? '',
      }),
    );
    setAdded(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {product.images.map((img) => (
            <Image
              key={img}
              source={{ uri: img }}
              style={{ width, aspectRatio: 3 / 4 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="headlineSmall" style={{ flex: 1, fontWeight: '800' }}>
              {localized(product.name)}
            </Text>
            <StockBadge stock={product.stock} />
          </View>

          <Rating value={product.rating} />
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          <Text style={{ opacity: 0.7 }}>{localized(product.description)}</Text>

          {needsSize ? (
            <View style={{ gap: 6 }}>
              <Text variant="titleSmall">{t('catalog.selectSize')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.sizes.map((s) => (
                  <Chip key={s} selected={size === s} showSelectedCheck onPress={() => setSize(s)}>
                    {s}
                  </Chip>
                ))}
              </View>
            </View>
          ) : null}

          {needsColor ? (
            <View style={{ gap: 6 }}>
              <Text variant="titleSmall">{t('catalog.selectColor')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.colors.map((c) => (
                  <Chip
                    key={c}
                    selected={color === c}
                    showSelectedCheck
                    onPress={() => setColor(c)}
                  >
                    {c}
                  </Chip>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text variant="titleSmall">{t('catalog.quantity')}</Text>
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={1}
              max={Math.max(1, product.stock)}
            />
          </View>

          <Button mode="contained" disabled={!canAdd} onPress={handleAdd}>
            {t('catalog.addToCart')}
          </Button>
        </View>
      </ScrollView>

      <Snackbar visible={added} onDismiss={() => setAdded(false)} duration={2500}>
        {t('catalog.addedToCart')}
      </Snackbar>
    </View>
  );
}
