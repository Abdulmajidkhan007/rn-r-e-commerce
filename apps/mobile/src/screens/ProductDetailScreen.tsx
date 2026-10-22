import { useLayoutEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  Share,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProduct, useProducts } from '@kidswear/data';
import { useAppDispatch, addItem } from '@kidswear/store';
import { describeVariantPicker } from '@kidswear/core';
import { tokens } from '@kidswear/theme';
import { useTranslation } from '@kidswear/i18n';
import { PriceTag, QuantityStepper } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import type { RootStackParamList } from '@/navigation/types';
import { FavoriteButton } from '@/components/catalog/FavoriteButton';
import { ProductImage } from '@/components/ProductImage';
import { Rating } from '@/components/Rating';
import { ProductReviews } from '@/components/reviews/ProductReviews';

const { width } = Dimensions.get('window');

function ProductGallery({ images, alt }: { images: string[]; alt: string }): React.ReactElement {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  if (images.length === 0) {
    return (
      <ProductImage
        src={undefined}
        accessibilityLabel={alt}
        style={{ width, aspectRatio: 4 / 5 }}
      />
    );
  }

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
          <ProductImage src={item} accessibilityLabel={alt} style={{ width, aspectRatio: 4 / 5 }} />
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
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const id = params?.id ?? '';
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { products: related } = useProducts({ categoryId: product?.categoryId });

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const shareName = product ? localized(product.name) : undefined;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        shareName === undefined
          ? undefined
          : () => (
              <IconButton
                icon="share-variant-outline"
                accessibilityLabel={t('catalog.share')}
                onPress={() => void Share.share({ message: shareName })}
              />
            ),
    });
  }, [navigation, shareName, t]);

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

  const picker = describeVariantPicker(product, size, color);
  const { needsSize, needsColor, variant } = picker;
  const picked = (!needsSize || size !== null) && (!needsColor || color !== null);
  const relatedProducts = related.filter((p) => p.id !== product.id);

  const handleAdd = (): void => {
    if (!variant) return;
    dispatch(
      addItem({
        productId: product.id,
        variantId: variant.id,
        name: localized(product.name),
        image: product.images[0] ?? '',
        price: picker.price,
        quantity: Math.min(qty, picker.available),
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
            <FavoriteButton productId={product.id} size={22} />
          </View>

          {product.reviewCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Rating value={product.rating} size={16} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {product.rating.toFixed(1)} · {t('reviews.count', { count: product.reviewCount })}
              </Text>
            </View>
          ) : null}

          <PriceTag
            price={picker.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            format={picker.priceIsFrom ? (price) => t('catalog.priceFrom', { price }) : undefined}
          />
          <Text variant="bodyMedium" style={{ opacity: 0.7, lineHeight: 24 }}>
            {localized(product.description)}
          </Text>

          {needsSize ? (
            <View style={{ gap: 6 }}>
              <Text variant="titleSmall">{t('catalog.selectSize')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {picker.sizes.map(({ value: s, disabled }) => (
                  <Chip
                    key={s}
                    selected={size === s}
                    disabled={disabled}
                    showSelectedCheck
                    onPress={() => setSize(size === s ? null : s)}
                    textStyle={disabled ? { textDecorationLine: 'line-through' } : undefined}
                  >
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
                {picker.colors.map(({ value: c, disabled }) => (
                  <Chip
                    key={c}
                    selected={color === c}
                    disabled={disabled}
                    showSelectedCheck
                    onPress={() => setColor(color === c ? null : c)}
                    textStyle={disabled ? { textDecorationLine: 'line-through' } : undefined}
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
              max={Math.max(1, variant ? picker.available : product.stock)}
            />
          </View>

          {picked && variant ? (
            <Text
              variant="bodyMedium"
              style={{
                color: picker.canAdd ? theme.colors.onSurfaceVariant : theme.colors.error,
                marginTop: tokens.spacing['2xs'],
              }}
            >
              {picker.canAdd
                ? t('catalog.variantInStock', { count: picker.available })
                : t('catalog.variantUnavailable')}
            </Text>
          ) : null}

          <Button
            mode="contained"
            disabled={!picker.canAdd}
            onPress={handleAdd}
            style={{ width: '100%' }}
          >
            {picked ? t('catalog.addToCart') : t('catalog.chooseVariant')}
          </Button>

          <ProductReviews product={product} />

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
