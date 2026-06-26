import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text } from 'react-native-paper';
import type { Product } from '@kidswear/core';
import { PriceTag } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { StockBadge } from './StockBadge';

export function ProductCard({ product }: { product: Product }): React.ReactElement {
  const router = useRouter();
  const localized = useLocalized();
  const image = product.images[0];

  return (
    <Card mode="outlined" onPress={() => router.push(`/product/${product.id}`)}>
      {image ? <Card.Cover source={{ uri: image }} style={{ aspectRatio: 3 / 4 }} /> : null}
      <Card.Content style={{ paddingTop: 8, gap: 4 }}>
        <Text variant="titleSmall" numberOfLines={1}>
          {localized(product.name)}
        </Text>
        <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
        <View style={{ flexDirection: 'row' }}>
          <StockBadge stock={product.stock} />
        </View>
      </Card.Content>
    </Card>
  );
}
