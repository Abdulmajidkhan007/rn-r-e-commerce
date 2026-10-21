import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCategories, useProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { LanguageMenu, Skeleton, ThemeToggle } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import { useProductGrid } from '@/lib/useProductGrid';

export function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const localized = useLocalized();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cardWidth } = useProductGrid();
  const { products, isLoading } = useProducts({ sort: 'newest' });
  const categoriesQuery = useCategories();

  const newest = products.slice(0, 6);
  const categories = categoriesQuery.data ?? [];
  const openCatalog = (): void => navigation.navigate('Tabs', { screen: 'Catalog' });

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: tokens.spacing.xl,
        gap: 20,
      }}
    >
      {/* Header: brand on the left, language + theme on the right. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.primary }}>
            {t('appName')}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('branding.tagline')}
          </Text>
        </View>
        <LanguageMenu />
        <ThemeToggle />
      </View>

      <Card mode="contained" style={{ backgroundColor: theme.colors.primaryContainer }}>
        <Card.Content style={{ gap: 12, paddingVertical: 20 }}>
          <Text
            variant="titleLarge"
            style={{ fontWeight: '800', color: theme.colors.onPrimaryContainer }}
          >
            {t('landing.heroTitle')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {t('landing.heroSubtitle')}
          </Text>
          <Button
            mode="contained"
            icon="shopping-outline"
            onPress={openCatalog}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('landing.shopNow')}
          </Button>
        </Card.Content>
      </Card>

      {categories.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {t('catalog.category')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {categories.map((category) => (
              <Chip key={category.id} icon="tag-outline" onPress={openCatalog}>
                {localized(category.name)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {t('catalog.newArrivals')}
          </Text>
          {newest.length > 0 ? (
            <Button compact onPress={openCatalog}>
              {t('landing.seeAll')}
            </Button>
          ) : null}
        </View>

        {isLoading ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={180} />
              <Skeleton width="60%" />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={180} />
              <Skeleton width="60%" />
            </View>
          </View>
        ) : newest.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {newest.map((product) => (
              <View key={product.id} style={{ width: cardWidth }}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        ) : (
          <Card mode="outlined">
            <Card.Content style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
              <Icon source="hanger" size={40} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('catalog.noProducts')}
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Reachable signed out too — Profile (which also links them) needs an account. */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card mode="outlined" style={{ flex: 1 }} onPress={() => navigation.navigate('Blog')}>
          <Card.Content style={{ alignItems: 'center', gap: 6, paddingVertical: 16 }}>
            <Icon source="post-outline" size={28} color={theme.colors.primary} />
            <Text variant="labelLarge">{t('blog.title')}</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={{ flex: 1 }} onPress={() => navigation.navigate('Contact')}>
          <Card.Content style={{ alignItems: 'center', gap: 6, paddingVertical: 16 }}>
            <Icon source="message-text-outline" size={28} color={theme.colors.primary} />
            <Text variant="labelLarge" numberOfLines={1}>
              {t('contact.title')}
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}
