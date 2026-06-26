import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';

export interface PriceTagProps {
  /** Price in UZS integer som. */
  price: number;
  /** Optional original price to show struck-through. */
  compareAtPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT = {
  sm: 'bodyMedium',
  md: 'titleMedium',
  lg: 'titleLarge',
} as const;

/** Displays a UZS price (and optional discounted-from price) in the active locale. */
export function PriceTag({
  price,
  compareAtPrice,
  size = 'md',
}: PriceTagProps): React.ReactElement {
  const language = useAppSelector((s) => s.ui.language);
  const showCompare = compareAtPrice !== undefined && compareAtPrice > price;

  return (
    <View className="flex-row items-baseline gap-2">
      <Text variant={VARIANT[size]} style={{ fontWeight: '700' }}>
        {formatPrice(price, language)}
      </Text>
      {showCompare && (
        <Text variant="bodySmall" style={{ textDecorationLine: 'line-through', opacity: 0.6 }}>
          {formatPrice(compareAtPrice, language)}
        </Text>
      )}
    </View>
  );
}
