import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Menu, Searchbar, Text } from 'react-native-paper';
import type { Product } from '@kidswear/core';
import { useCategories, useProducts, type ProductSort } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import { useProductGrid } from '@/lib/useProductGrid';
import { useDebounced } from '@/lib/useDebounced';

const SORTS: ProductSort[] = ['newest', 'priceAsc', 'priceDesc'];
const SORT_LABEL = {
  newest: 'catalog.newest',
  priceAsc: 'catalog.priceLowHigh',
  priceDesc: 'catalog.priceHighLow',
} as const;

export function CatalogScreen(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { columns, cardWidth } = useProductGrid();
  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ProductSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const search = useDebounced(searchInput);

  const params = useMemo(() => ({ categoryId, search, sort }), [categoryId, search, sort]);
  const {
    products,
    isLoading,
    isError,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useProducts(params);

  const header = (
    <View style={{ gap: 16, paddingBottom: 16 }}>
      <Text variant="headlineLarge">{t('nav.catalog')}</Text>

      <Searchbar
        mode="bar"
        placeholder={t('catalog.search')}
        value={searchInput}
        onChangeText={setSearchInput}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      >
        <Chip selected={categoryId === undefined} onPress={() => setCategoryId(undefined)}>
          {t('catalog.allCategories')}
        </Chip>
        {(categoriesQuery.data ?? []).map((category) => (
          <Chip
            key={category.id}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          >
            {localized(category.name)}
          </Chip>
        ))}
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <Button compact icon="sort" mode="outlined" onPress={() => setMenuOpen(true)}>
              {t(SORT_LABEL[sort])}
            </Button>
          }
        >
          {SORTS.map((s) => (
            <Menu.Item
              key={s}
              title={t(SORT_LABEL[s])}
              onPress={() => {
                setSort(s);
                setMenuOpen(false);
              }}
            />
          ))}
        </Menu>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: Product }): React.ReactElement => (
    <View style={{ width: cardWidth }}>
      <ProductCard product={item} />
    </View>
  );

  return (
    <FlatList
      data={isLoading ? [] : products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      key={columns}
      numColumns={columns}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: tokens.spacing.xl }}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
          {isError ? (
            <>
              <Text style={{ opacity: 0.7 }}>{t('catalog.loadError')}</Text>
              <Button mode="contained" onPress={() => void refetch()}>
                {t('catalog.retry')}
              </Button>
            </>
          ) : isLoading ? (
            <Text style={{ opacity: 0.7 }}>{t('common.loading')}</Text>
          ) : (
            <Text style={{ opacity: 0.7 }}>{t('catalog.noProducts')}</Text>
          )}
        </View>
      }
    />
  );
}
