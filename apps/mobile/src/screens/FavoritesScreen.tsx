import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProductsByIds } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useFavoritesContext } from '@/providers/FavoritesProvider';

export function FavoritesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { ordered, isLoading } = useFavoritesContext();
  const { products, isLoading: productsLoading } = useProductsByIds(ordered);

  if (isLoading || productsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View
        style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text variant="bodyLarge" style={{ textAlign: 'center', opacity: 0.7 }}>
          {t('favorites.empty')}
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('Tabs', { screen: 'Catalog' })}>
          {t('landing.shopNow')}
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1, maxWidth: '50%' }}>
          <ProductCard product={item} />
        </View>
      )}
    />
  );
}
