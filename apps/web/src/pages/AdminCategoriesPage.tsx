import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Category } from '@kidswear/core';
import { useAdminProducts, useCategories, useDeleteCategory } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

export default function AdminCategoriesPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useAdminProducts();
  const deleteCategory = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | undefined>(undefined);

  // Count products per category to guard deletion of an in-use category.
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return counts;
  }, [products]);

  const deletingInUse = !!deleting && (usage.get(deleting.id) ?? 0) > 0;

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (category: Category): void => {
    setEditing(category);
    setFormOpen(true);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h2">{t('admin.categories')}</Typography>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={openCreate}>
          {t('admin.addCategory')}
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : categories.length === 0 ? (
          <EmptyState title={t('admin.noCategories')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.name')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.slug')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('admin.order')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {t('admin.products')}
                </TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 1) } }}
                >
                  <TableCell>{c.name.uz}</TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell align="right">{c.order}</TableCell>
                  <TableCell align="right">{usage.get(c.id) ?? 0}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleting(c)}>
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
        <CategoryFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          category={editing}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t('admin.deleteCategory')}
        message={deletingInUse ? t('admin.inUseCannotDelete') : t('admin.confirmDelete')}
        confirmDisabled={deletingInUse}
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting && !deletingInUse) deleteCategory.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </Stack>
  );
}
