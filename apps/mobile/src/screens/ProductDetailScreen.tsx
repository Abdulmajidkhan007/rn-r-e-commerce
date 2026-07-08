import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ActivityIndicator, Button, Chip, Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProduct, useProducts } from '@kidswear/data';
import { useAppDispatch, addItem } from '@kidswear/store';
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { PriceTag, QuantityStepper } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import type { RootStackParamList } from '@/navigation/types';

const { width } = Dimensions.get('window');

function ProductGallery({ images, alt }: { images: string[]; alt: string }): React.ReactElement {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <View>
      <FlatList
        data={images}
        keyExtractor={(img, i) => `${img}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            accessibilityLabel={alt}
            style={{ width, aspectRatio: 4 / 5 }}
            resizeMode="cover"
          />
        )}
      />
      {images.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {images.map((img, i) => (
            <View
              key={img}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === activeIndex ? theme.colors.primary : theme.colors.outlineVariant,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ProductDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const id = params?.id ?? '';
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { products: related } = useProducts({ categoryId: product?.categoryId });

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
  const relatedProducts = related.filter((p) => p.id !== product.id);

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
        <ProductGallery images={product.images} alt={localized(product.name)} />

        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="headlineMedium" style={{ flex: 1 }}>
              {localized(product.name)}
            </Text>
            <StockBadge stock={product.stock} />
          </View>

          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          <Text
            variant="bodyMedium"
            style={{ opacity: 0.7, lineHeight: 24 }}
          >
            {localized(product.description)}
          </Text>

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

          <Button mode="contained" disabled={!canAdd} onPress={handleAdd} style={{ width: '100%' }}>
            {t('catalog.addToCart')}
          </Button>

          {relatedProducts.length > 0 ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <Text variant="titleMedium">{t('catalog.featured')}</Text>
              <FlatList
                data={relatedProducts}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <View style={{ width: width * 0.42 }}>
                    <ProductCard product={item} />
                  </View>
                )}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Snackbar visible={added} onDismiss={() => setAdded(false)} duration={2500}>
        {t('catalog.addedToCart')}
      </Snackbar>
    </View>
  );
}
