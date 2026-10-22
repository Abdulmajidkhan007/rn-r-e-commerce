import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { Product } from '@kidswear/core';
import { stockStatus } from '@kidswear/utils';
import { tokens } from '@kidswear/theme';
import { PriceTag, ProductImage } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { StockBadge } from './StockBadge';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ product }: { product: Product }): React.ReactElement {
  const navigation = useNavigation();
  const localized = useLocalized();
  const theme = useTheme();
  const image = product.images[0];
  const isOut = stockStatus(product.stock) === 'out';
  // MD3 cards round their corners at 3× the theme roundness.
  const cardRadius = theme.roundness * 3;

  return (
    <Card
      mode="contained"
      onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
      style={{ backgroundColor: theme.colors.surface, overflow: 'hidden' }}
    >
      {/* The media frame always keeps its 4:5 size (photo or placeholder) and clips
          to the card's top corners; the overlays stay inside it. */}
      <View
        style={{
          alignSelf: 'stretch',
          aspectRatio: 4 / 5,
          overflow: 'hidden',
          borderTopLeftRadius: cardRadius,
          borderTopRightRadius: cardRadius,
        }}
      >
        <ProductImage
          src={image}
          accessibilityLabel={localized(product.name)}
          style={{ flex: 1 }}
          imageStyle={{ opacity: isOut ? 0.5 : 1 }}
        />
        <View style={{ position: 'absolute', top: tokens.spacing.sm, left: tokens.spacing.sm }}>
          <StockBadge stock={product.stock} dense />
        </View>
        <View style={{ position: 'absolute', top: tokens.spacing.xs, right: tokens.spacing.xs }}>
          <FavoriteButton productId={product.id} size={16} compact />
        </View>
      </View>
      <Card.Content
        style={{
          paddingTop: tokens.spacing.sm,
          paddingBottom: tokens.spacing.md,
          gap: tokens.spacing.xs,
        }}
      >
        <Text variant="bodyMedium" numberOfLines={2} style={{ minHeight: 36 }}>
          {localized(product.name)}
        </Text>
        <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
      </Card.Content>
    </Card>
  );
}
