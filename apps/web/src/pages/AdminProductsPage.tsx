import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {
  hasNoImages,
  isPurgeable,
  productsToCsv,
  trashDaysLeft,
  type Product,
} from '@kidswear/core';
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
import { useTranslation } from '@kidswear/i18n';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CatalogCsvDialog } from '@/components/admin/CatalogCsvDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

export default function AdminProductsPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const { data: products = [], isLoading } = useAdminProducts();
  const { data: categories = [] } = useCategories();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { data: trashed = [] } = useTrashedProducts();
  const bulk = useBulkUpdateProducts();
  const hideNoImages = useHideProductsWithoutImages();
  const restoreProduct = useRestoreProduct();
  const purgeProduct = usePurgeProduct();
  const purgeExpired = usePurgeExpiredProducts();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);
  const [tab, setTab] = useState<'products' | 'trash'>('products');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState('');
  const [confirm, setConfirm] = useState<
    'bulkDelete' | 'hideNoImages' | 'purgeExpired' | { purge: Product } | null
  >(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [notice, setNotice] = useState('');
  // Fixed per render pass of the trash: avoids calling the clock while rendering rows.
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
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggle = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (): void =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));

  const runBulk = (action: Parameters<typeof bulk.mutate>[0]['action']): void => {
    bulk.mutate(
      { ids: selectedIds, action },
      {
        onSuccess: (count) => {
          setNotice(t('admin.catalog.bulkDone', { count }));
          setSelected(new Set());
          setMoveTarget('');
        },
      },
    );
  };

  const noImageCount = products.filter((p) => p.isActive && hasNoImages(p)).length;
  const expiredCount = trashed.filter((p) => isPurgeable(p, now)).length;

  const exportCsv = (): void => {
    // BOM so Excel reads the UTF-8 names correctly.
    const blob = new Blob(['\uFEFF', productsToCsv(products)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kidswear-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (product: Product): void => {
    setEditing(product);
    setFormOpen(true);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h2">{t('admin.products')}</Typography>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={openCreate}>
          {t('admin.addProduct')}
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v: 'products' | 'trash') => setTab(v)}>
        <Tab value="products" label={t('admin.catalog.tabProducts')} />
        <Tab value="trash" label={`${t('admin.catalog.tabTrash')} (${trashed.length})`} />
      </Tabs>

      {notice && (
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {tab === 'trash' ? (
        <TrashList
          products={trashed}
          now={now}
          expiredCount={expiredCount}
          onRestore={(id) => restoreProduct.mutate(id)}
          onPurge={(p) => setConfirm({ purge: p })}
          onPurgeExpired={() => setConfirm('purgeExpired')}
        />
      ) : (
        <>
          <Card
            variant="outlined"
            sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
          >
            <TextField
              label={t('admin.search')}
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <TextField
              select
              label={t('admin.filterByCategory')}
              size="small"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">{t('admin.allCategories')}</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name.uz}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              size="small"
              disabled={noImageCount === 0}
              onClick={() => setConfirm('hideNoImages')}
            >
              {t('admin.catalog.hideNoImages')} ({noImageCount})
            </Button>
            <Button variant="outlined" size="small" onClick={exportCsv}>
              {t('admin.catalog.exportCsv')}
            </Button>
            <Button variant="outlined" size="small" onClick={() => setCsvOpen(true)}>
              {t('admin.catalog.importCsv')}
            </Button>
          </Card>

          {selectedIds.length > 0 && (
            <Card
              variant="outlined"
              sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('admin.catalog.selected', { count: selectedIds.length })}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => runBulk({ type: 'hide' })}>
                {t('admin.catalog.hideSelected')}
              </Button>
              <TextField
                select
                size="small"
                label={t('admin.catalog.moveTo')}
                value={moveTarget}
                onChange={(e) => {
                  setMoveTarget(e.target.value);
                  if (e.target.value) runBulk({ type: 'move', categoryId: e.target.value });
                }}
                sx={{ minWidth: 200 }}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name.uz}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => setConfirm('bulkDelete')}
              >
                {t('admin.catalog.deleteSelected')}
              </Button>
            </Card>
          )}

          <Card variant="outlined" sx={{ boxShadow: 'none' }}>
            {isLoading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : filtered.length === 0 ? (
              <EmptyState title={t('admin.noProducts')} />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={selectedIds.length > 0 && !allSelected}
                        onChange={toggleAll}
                        slotProps={{ input: { 'aria-label': t('admin.catalog.selectAll') } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('admin.name')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('admin.category')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('admin.price')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('admin.stock')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      {t('admin.active')}
                    </TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      sx={{ '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 1) } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          slotProps={{ input: { 'aria-label': p.name.uz } }}
                        />
                      </TableCell>
                      <TableCell>
                        {p.name.uz}
                        {p.isDraft && (
                          <Chip
                            size="small"
                            color="warning"
                            label={t('admin.catalog.draft')}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{categoryName.get(p.categoryId) ?? p.categoryId}</TableCell>
                      <TableCell align="right">{formatPrice(p.price, language)}</TableCell>
                      <TableCell align="right">{p.stock}</TableCell>
                      <TableCell align="center">
                        <Switch
                          size="small"
                          checked={p.isActive}
                          onChange={(e) =>
                            updateProduct.mutate({
                              id: p.id,
                              patch: { isActive: e.target.checked },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleting(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      {formOpen && (
        <ProductFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          categories={categories}
          product={editing}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t('admin.deleteProduct')}
        message={t('admin.catalog.deleteMessage')}
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) deleteProduct.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === 'bulkDelete'
            ? t('admin.catalog.deleteSelected')
            : confirm === 'hideNoImages'
              ? t('admin.catalog.hideNoImages')
              : confirm === 'purgeExpired'
                ? t('admin.catalog.purgeExpired')
                : t('admin.catalog.deleteForever')
        }
        message={
          confirm === 'bulkDelete'
            ? t('admin.catalog.deleteSelectedMsg', { count: selectedIds.length })
            : confirm === 'hideNoImages'
              ? t('admin.catalog.hideNoImagesMsg')
              : confirm === 'purgeExpired'
                ? expiredCount === 0
                  ? t('admin.catalog.purgeExpiredNone')
                  : t('admin.catalog.purgeExpiredMsg', { count: expiredCount })
                : t('admin.catalog.deleteForeverMsg')
        }
        confirmDisabled={confirm === 'purgeExpired' && expiredCount === 0}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action === 'bulkDelete') runBulk({ type: 'trash' });
          else if (action === 'hideNoImages') {
            hideNoImages.mutate(undefined, {
              onSuccess: (count) => setNotice(t('admin.catalog.hideNoImagesDone', { count })),
            });
          } else if (action === 'purgeExpired') purgeExpired.mutate();
          else if (action) purgeProduct.mutate(action.purge.id);
        }}
      />

      {csvOpen && (
        <CatalogCsvDialog
          open={csvOpen}
          onClose={() => setCsvOpen(false)}
          categories={categories}
        />
      )}
    </Stack>
  );
}

interface TrashListProps {
  products: readonly Product[];
  now: number;
  expiredCount: number;
  onRestore: (id: string) => void;
  onPurge: (product: Product) => void;
  onPurgeExpired: () => void;
}

function TrashList({
  products,
  now,
  expiredCount,
  onRestore,
  onPurge,
  onPurgeExpired,
}: TrashListProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {t('admin.catalog.restoreHint')}
        </Typography>
        <Button variant="outlined" color="error" size="small" onClick={onPurgeExpired}>
          {t('admin.catalog.purgeExpired')} ({expiredCount})
        </Button>
      </Stack>
      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {products.length === 0 ? (
          <EmptyState title={t('admin.catalog.trashEmpty')} />
        ) : (
          <Table size="small">
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.name.uz}</TableCell>
                  <TableCell>
                    {isPurgeable(p, now) ? (
                      <Chip size="small" color="error" label={t('admin.catalog.dueForPurge')} />
                    ) : (
                      t('admin.catalog.daysLeft', { count: trashDaysLeft(p, now) })
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={t('admin.catalog.restore')}
                      title={t('admin.catalog.restore')}
                      onClick={() => onRestore(p.id)}
                    >
                      <RestoreFromTrashIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={t('admin.catalog.deleteForever')}
                      title={t('admin.catalog.deleteForever')}
                      onClick={() => onPurge(p)}
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
