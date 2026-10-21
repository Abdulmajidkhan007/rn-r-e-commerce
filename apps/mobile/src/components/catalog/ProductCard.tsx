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
      style={{ backgroundColor: theme.colors.surface }}
    >
      {/* The media frame always keeps its 4:5 size (photo or placeholder), so the
          overlays below stay on the picture and never drift onto the title. */}
      <View style={{ position: 'relative' }}>
        <ProductImage
          src={image}
          accessibilityLabel={localized(product.name)}
          style={{
            width: '100%',
            aspectRatio: 4 / 5,
            borderTopLeftRadius: cardRadius,
            borderTopRightRadius: cardRadius,
          }}
          imageStyle={{ opacity: isOut ? 0.5 : 1 }}
        />
        <View style={{ position: 'absolute', top: tokens.spacing.sm, right: tokens.spacing.sm }}>
          <StockBadge stock={product.stock} />
        </View>
        <View style={{ position: 'absolute', top: tokens.spacing.xs, left: tokens.spacing.xs }}>
          <FavoriteButton productId={product.id} size={18} />
        </View>
      </View>
      <Card.Content style={{ paddingTop: 10, paddingBottom: 12, gap: 4 }}>
        <Text variant="bodyMedium" numberOfLines={2} style={{ minHeight: 36 }}>
          {localized(product.name)}
        </Text>
        <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
      </Card.Content>
    </Card>
  );
}
