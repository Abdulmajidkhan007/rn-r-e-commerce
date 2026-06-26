import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { Button, Chip, Menu, Searchbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product } from '@kidswear/core';
import { useCategories, useProducts, type ProductSort } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import { useDebounced } from '@/lib/useDebounced';

const SORTS: ProductSort[] = ['newest', 'priceAsc', 'priceDesc'];
const SORT_LABEL = {
  newest: 'catalog.newest',
  priceAsc: 'catalog.priceLowHigh',
  priceDesc: 'catalog.priceHighLow',
} as const;

export default function CatalogScreen(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const insets = useSafeAreaInsets();
  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ProductSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const search = useDebounced(searchInput);

  const params = useMemo(() => ({ categoryId, search, sort }), [categoryId, search, sort]);
  const { products, isLoading, isError, isRefetching, refetch } = useProducts(params);

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <Searchbar
        placeholder={t('catalog.search')}
        value={searchInput}
        onChangeText={setSearchInput}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
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
      </ScrollView>
      <View style={{ flexDirection: 'row' }}>
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <Button icon="sort" mode="outlined" onPress={() => setMenuOpen(true)}>
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
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Product }): React.ReactElement => (
    <View style={{ flex: 1, maxWidth: '50%' }}>
      <ProductCard product={item} />
    </View>
  );

  return (
    <FlatList
      data={isLoading ? [] : products}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
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
