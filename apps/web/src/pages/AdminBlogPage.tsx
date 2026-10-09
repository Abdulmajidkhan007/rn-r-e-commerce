import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { BlogPost } from '@kidswear/core';
import { useAdminPosts, useDeleteBlogPost } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { BlogPostDialog } from '@/components/admin/BlogPostDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

export default function AdminBlogPage(): React.ReactElement {
  const { t } = useTranslation();
  const { data: posts = [], isLoading } = useAdminPosts();
  const remove = useDeleteBlogPost();
  const [editing, setEditing] = useState<BlogPost | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<BlogPost | undefined>(undefined);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h2">{t('adminContent.blog')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          {t('adminContent.newPost')}
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {isLoading ? (
          <TableSkeleton rows={4} columns={3} />
        ) : posts.length === 0 ? (
          <EmptyState title={t('adminContent.noPosts')} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('adminContent.postTitle')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('adminContent.status')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.title.uz}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /blog/{p.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={p.published ? 'success' : 'default'}
                        label={p.published ? t('adminContent.published') : t('adminContent.draft')}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton
                        size="small"
                        aria-label={t('adminContent.edit')}
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={t('adminContent.delete')}
                        onClick={() => setDeleting(p)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {formOpen && (
        <BlogPostDialog open={formOpen} post={editing} onClose={() => setFormOpen(false)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t('adminContent.deletePost')}
        message={t('admin.confirmDelete')}
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(undefined);
        }}
      />
    </Stack>
  );
}
