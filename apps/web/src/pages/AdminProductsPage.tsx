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
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Product } from '@kidswear/core';
import { useAdminProducts, useCategories, useDeleteProduct, useUpdateProduct } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
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

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
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
      </Card>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('admin.noProducts')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
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
                  <TableCell>{p.name.uz}</TableCell>
                  <TableCell>{categoryName.get(p.categoryId) ?? p.categoryId}</TableCell>
                  <TableCell align="right">{formatPrice(p.price, language)}</TableCell>
                  <TableCell align="right">{p.stock}</TableCell>
                  <TableCell align="center">
                    <Switch
                      size="small"
                      checked={p.isActive}
                      onChange={(e) =>
                        updateProduct.mutate({ id: p.id, patch: { isActive: e.target.checked } })
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
        message={t('admin.confirmDelete')}
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) deleteProduct.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </Stack>
  );
}
