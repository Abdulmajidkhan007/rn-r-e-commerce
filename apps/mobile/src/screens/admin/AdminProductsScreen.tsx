import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Menu,
  Searchbar,
  Switch,
  Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product } from '@kidswear/core';
import { useAdminProducts, useCategories, useDeleteProduct, useUpdateProduct } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function AdminProductsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { data: products = [], isLoading } = useAdminProducts();
  const { data: categories = [] } = useCategories();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterMenu, setFilterMenu] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name.uz])),
    [categories],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!term) return true;
      return [p.name.uz, p.name.en, p.name.ru]
        .filter((s): s is string => !!s)
        .some((s) => s.toLowerCase().includes(term));
    });
  }, [products, search, categoryId]);

  const openCreate = (): void => {
    setEditing(undefined);
    setFormVisible(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Product }): React.ReactElement => (
    <Card mode="outlined">
      <Card.Content style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="titleSmall" style={{ flex: 1 }}>
            {item.name.uz}
          </Text>
          <Switch
            value={item.isActive}
            onValueChange={(v) => updateProduct.mutate({ id: item.id, patch: { isActive: v } })}
          />
        </View>
        <Text variant="bodySmall" style={{ opacity: 0.7 }}>
          {categoryName.get(item.categoryId) ?? item.categoryId}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="bodyMedium">
            {formatPrice(item.price, language)} · {t('admin.stock')}: {item.stock}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon="pencil"
              size={18}
              onPress={() => {
                setEditing(item);
                setFormVisible(true);
              }}
            />
            <IconButton icon="delete" size={18} onPress={() => setDeleting(item)} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Searchbar placeholder={t('admin.search')} value={search} onChangeText={setSearch} />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Menu
            visible={filterMenu}
            onDismiss={() => setFilterMenu(false)}
            anchor={
              <Button mode="outlined" icon="filter-variant" onPress={() => setFilterMenu(true)}>
                {categoryId ? categoryName.get(categoryId) ?? '' : t('admin.allCategories')}
              </Button>
            }
          >
            <Menu.Item
              title={t('admin.allCategories')}
              onPress={() => {
                setCategoryId('');
                setFilterMenu(false);
              }}
            />
            {categories.map((c) => (
              <Menu.Item
                key={c.id}
                title={c.name.uz}
                onPress={() => {
                  setCategoryId(c.id);
                  setFilterMenu(false);
                }}
              />
            ))}
          </Menu>
          <Button mode="contained" icon="plus" onPress={openCreate}>
            {t('admin.addProduct')}
          </Button>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: insets.bottom + 24,
        }}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: 24 }}>
            {t('admin.noProducts')}
          </Text>
        }
      />

      {formVisible && (
        <ProductFormDialog
          visible={formVisible}
          categories={categories}
          product={editing}
          onDismiss={() => setFormVisible(false)}
        />
      )}

      <ConfirmDialog
        visible={!!deleting}
        title={t('admin.deleteProduct')}
        message={t('admin.confirmDelete')}
        onDismiss={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) deleteProduct.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </View>
  );
}
