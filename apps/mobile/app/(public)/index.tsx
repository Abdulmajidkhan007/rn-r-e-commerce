import { ScrollView, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCategories, useProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { LanguageSwitcher, Skeleton, ThemeToggle } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { products, isLoading } = useProducts({ sort: 'newest' });
  const categoriesQuery = useCategories();

  const newest = products.slice(0, 6);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <View className="flex-row items-center justify-between">
        <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
          {t('appName')}
        </Text>
        <View className="flex-row items-center">
          <LanguageSwitcher />
          <ThemeToggle />
        </View>
      </View>

      {(categoriesQuery.data ?? []).length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text variant="titleMedium">{t('catalog.category')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(categoriesQuery.data ?? []).map((category) => (
              <Chip key={category.id} onPress={() => router.push('/catalog')}>
                {localized(category.name)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text variant="titleMedium">{t('catalog.newArrivals')}</Text>
      {isLoading ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={180} />
          <Skeleton width="60%" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {newest.map((product) => (
            <View key={product.id} style={{ width: '47%' }}>
              <ProductCard product={product} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
