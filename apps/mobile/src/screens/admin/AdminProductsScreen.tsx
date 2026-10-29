import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Menu,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasNoImages, isPurgeable, trashDaysLeft, type Product } from '@kidswear/core';
import {
  useAdminProducts,
  useBulkUpdateProducts,
  useCategories,
  useDeleteProduct,
  useHideProductsWithoutImages,
  usePurgeExpiredProducts,
  usePurgeProduct,
  useRestoreProduct,
  useTrashedProducts,
  useUpdateProduct,
} from '@kidswear/data';
import type { BulkProductAction } from '@kidswear/firebase';
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
  const { data: trashed = [] } = useTrashedProducts();
  const restoreProduct = useRestoreProduct();
  const purgeProduct = usePurgeProduct();
  const purgeExpired = usePurgeExpiredProducts();
  const bulk = useBulkUpdateProducts();
  const hideNoImages = useHideProductsWithoutImages();
  const theme = useTheme();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterMenu, setFilterMenu] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);
  const [tab, setTab] = useState<'products' | 'trash'>('products');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [moveMenu, setMoveMenu] = useState(false);
  const [confirm, setConfirm] = useState<
    'bulkDelete' | 'hideNoImages' | 'purgeExpired' | 'purgeOne' | null
  >(null);
  const [purging, setPurging] = useState<Product | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [now] = useState(() => Date.now());

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

  // Selection only ever holds ids that are still in the visible list.
  const selectedIds = useMemo(
    () => filtered.filter((p) => selected.has(p.id)).map((p) => p.id),
    [filtered, selected],
  );
  const selecting = selectedIds.length > 0;
  const toggle = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = (action: BulkProductAction): void => {
    bulk.mutate(
      { ids: selectedIds, action },
      {
        onSuccess: (count) => {
          setNotice(t('admin.catalog.bulkDone', { count }));
          setSelected(new Set());
        },
      },
    );
  };

  const noImageCount = products.filter((p) => p.isActive && hasNoImages(p)).length;
  const expiredCount = trashed.filter((p) => isPurgeable(p, now)).length;

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
    <Card
      mode="outlined"
      onPress={selecting ? () => toggle(item.id) : undefined}
      onLongPress={() => toggle(item.id)}
      style={
        selected.has(item.id) ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined
      }
    >
      <Card.Content style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="titleSmall" style={{ flex: 1 }}>
            {item.name.uz}
          </Text>
          <Switch
            value={item.isActive}
            disabled={item.isDraft === true}
            onValueChange={(v) => updateProduct.mutate({ id: item.id, patch: { isActive: v } })}
          />
        </View>
        {item.isDraft ? (
          <Chip compact icon="pencil-ruler" style={{ alignSelf: 'flex-start' }}>
            {t('admin.catalog.draft')}
          </Chip>
        ) : null}
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

  const renderTrashItem = ({ item }: { item: Product }): React.ReactElement => (
    <Card mode="outlined">
      <Card.Content style={{ gap: 4 }}>
        <Text variant="titleSmall">{item.name.uz}</Text>
        <Text
          variant="bodySmall"
          style={{ color: isPurgeable(item, now) ? theme.colors.error : undefined }}
        >
          {isPurgeable(item, now)
            ? t('admin.catalog.dueForPurge')
            : t('admin.catalog.daysLeft', { count: trashDaysLeft(item, now) })}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <IconButton
            icon="restore"
            size={18}
            accessibilityLabel={t('admin.catalog.restore')}
            onPress={() => restoreProduct.mutate(item.id)}
          />
          <IconButton
            icon="delete-forever"
            size={18}
            iconColor={theme.colors.error}
            accessibilityLabel={t('admin.catalog.deleteForever')}
            onPress={() => {
              setPurging(item);
              setConfirm('purgeOne');
            }}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const emptyText = (
    <Text style={{ opacity: 0.7, textAlign: 'center', marginTop: 24 }}>
      {tab === 'trash' ? t('admin.catalog.trashEmpty') : t('admin.noProducts')}
    </Text>
  );

  const confirmTitle =
    confirm === 'bulkDelete'
      ? t('admin.catalog.deleteSelected')
      : confirm === 'hideNoImages'
        ? t('admin.catalog.hideNoImages')
        : confirm === 'purgeExpired'
          ? t('admin.catalog.purgeExpired')
          : t('admin.catalog.deleteForever');
  const confirmMessage =
    confirm === 'bulkDelete'
      ? t('admin.catalog.deleteSelectedMsg', { count: selectedIds.length })
      : confirm === 'hideNoImages'
        ? t('admin.catalog.hideNoImagesMsg')
        : confirm === 'purgeExpired'
          ? expiredCount === 0
            ? t('admin.catalog.purgeExpiredNone')
            : t('admin.catalog.purgeExpiredMsg', { count: expiredCount })
          : t('admin.catalog.deleteForeverMsg');

  const onConfirm = (): void => {
    const action = confirm;
    setConfirm(null);
    if (action === 'bulkDelete') runBulk({ type: 'trash' });
    else if (action === 'hideNoImages') {
      hideNoImages.mutate(undefined, {
        onSuccess: (count) => setNotice(t('admin.catalog.hideNoImagesDone', { count })),
      });
    } else if (action === 'purgeExpired') {
      purgeExpired.mutate(undefined, {
        onSuccess: (count) => setNotice(t('admin.catalog.bulkDone', { count })),
      });
    } else if (action === 'purgeOne' && purging) {
      purgeProduct.mutate(purging.id);
      setPurging(undefined);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => {
            setTab(v as 'products' | 'trash');
            setSelected(new Set());
          }}
          buttons={[
            { value: 'products', label: t('admin.catalog.tabProducts') },
            { value: 'trash', label: `${t('admin.catalog.tabTrash')} (${trashed.length})` },
          ]}
        />
      </View>
      {tab === 'trash' ? (
        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('admin.catalog.restoreHint')}
          </Text>
          <Button
            mode="outlined"
            icon="delete-sweep"
            disabled={expiredCount === 0}
            onPress={() => setConfirm('purgeExpired')}
          >
            {t('admin.catalog.purgeExpired')} ({expiredCount})
          </Button>
        </View>
      ) : null}
      {tab === 'products' ? (
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
                  {categoryId ? (categoryName.get(categoryId) ?? '') : t('admin.allCategories')}
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
          {selecting ? (
            <View style={{ gap: 8 }}>
              <Text variant="labelLarge">
                {t('admin.catalog.selected', { count: selectedIds.length })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button mode="outlined" icon="eye-off" onPress={() => runBulk({ type: 'hide' })}>
                  {t('admin.catalog.hideSelected')}
                </Button>
                <Menu
                  visible={moveMenu}
                  onDismiss={() => setMoveMenu(false)}
                  anchor={
                    <Button mode="outlined" icon="folder-move" onPress={() => setMoveMenu(true)}>
                      {t('admin.catalog.moveTo')}
                    </Button>
                  }
                >
                  {categories.map((c) => (
                    <Menu.Item
                      key={c.id}
                      title={c.name.uz}
                      onPress={() => {
                        setMoveMenu(false);
                        runBulk({ type: 'move', categoryId: c.id });
                      }}
                    />
                  ))}
                </Menu>
                <Button
                  mode="outlined"
                  icon="delete"
                  textColor={theme.colors.error}
                  onPress={() => setConfirm('bulkDelete')}
                >
                  {t('admin.catalog.deleteSelected')}
                </Button>
                <Button onPress={() => setSelected(new Set())}>{t('admin.cancel')}</Button>
              </View>
            </View>
          ) : (
            <Button
              mode="text"
              icon="image-off"
              disabled={noImageCount === 0}
              onPress={() => setConfirm('hideNoImages')}
            >
              {t('admin.catalog.hideNoImages')} ({noImageCount})
            </Button>
          )}
        </View>
      ) : null}

      <FlatList
        data={tab === 'trash' ? trashed : filtered}
        keyExtractor={(p) => p.id}
        renderItem={tab === 'trash' ? renderTrashItem : renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: insets.bottom + 24,
        }}
        ListEmptyComponent={emptyText}
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

      <ConfirmDialog
        visible={confirm !== null}
        title={confirmTitle}
        message={confirmMessage}
        confirmDisabled={confirm === 'purgeExpired' && expiredCount === 0}
        onDismiss={() => setConfirm(null)}
        onConfirm={onConfirm}
      />

      <Snackbar visible={notice !== ''} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </View>
  );
}
