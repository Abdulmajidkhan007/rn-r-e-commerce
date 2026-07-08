import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Card, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category } from '@kidswear/core';
import { useAdminProducts, useCategories, useDeleteCategory } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function AdminCategoriesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useAdminProducts();
  const deleteCategory = useDeleteCategory();

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | undefined>(undefined);

  // Count products per category to guard deletion of an in-use category.
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  const deletingInUse = !!deleting && (usage.get(deleting.id) ?? 0) > 0;

  const renderItem = ({ item }: { item: Category }): React.ReactElement => (
    <Card mode="outlined">
      <Card.Content
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall">{item.name.uz}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {item.slug} · {usage.get(item.id) ?? 0} {t('admin.products')}
          </Text>
        </View>
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
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, alignItems: 'flex-end' }}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => {
            setEditing(undefined);
            setFormVisible(true);
          }}
        >
          {t('admin.addCategory')}
        </Button>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: insets.bottom + 24,
        }}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: 24 }}>
            {t('admin.noCategories')}
          </Text>
        }
      />

      {formVisible && (
        <CategoryFormDialog
          visible={formVisible}
          category={editing}
          onDismiss={() => setFormVisible(false)}
        />
      )}

      <ConfirmDialog
        visible={!!deleting}
        title={t('admin.deleteCategory')}
        message={deletingInUse ? t('admin.inUseCannotDelete') : t('admin.confirmDelete')}
        confirmDisabled={deletingInUse}
        onDismiss={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting && !deletingInUse) deleteCategory.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </View>
  );
}
