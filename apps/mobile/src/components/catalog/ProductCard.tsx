import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { Product } from '@kidswear/core';
import { stockStatus } from '@kidswear/utils';
import { PriceTag } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { StockBadge } from './StockBadge';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ product }: { product: Product }): React.ReactElement {
  const navigation = useNavigation();
  const localized = useLocalized();
  const theme = useTheme();
  const image = product.images[0];
  const isOut = stockStatus(product.stock) === 'out';

  return (
    <Card
      mode="contained"
      onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <View style={{ position: 'relative' }}>
        {image ? (
          <Card.Cover
            source={{ uri: image }}
            style={{
              aspectRatio: 4 / 5,
              opacity: isOut ? 0.5 : 1,
            }}
          />
        ) : null}
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <StockBadge stock={product.stock} />
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
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
