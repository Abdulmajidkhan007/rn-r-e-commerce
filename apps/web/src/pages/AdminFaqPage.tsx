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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Faq } from '@kidswear/core';
import { useFaqs, useDeleteFaq } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { FaqDialog } from '@/components/admin/FaqDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

export default function AdminFaqPage(): React.ReactElement {
  const { t } = useTranslation();
  const { data: posts = [], isLoading } = useFaqs();
  const remove = useDeleteFaq();
  const [editing, setEditing] = useState<Faq | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Faq | undefined>(undefined);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h2">{t('adminContent.faq')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          {t('adminContent.newFaq')}
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {isLoading ? (
          <TableSkeleton rows={4} columns={3} />
        ) : posts.length === 0 ? (
          <EmptyState title={t('adminContent.noFaqs')} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('adminContent.faqQuestion')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('adminContent.faqOrder')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.question.uz}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.order}</TableCell>
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
        <FaqDialog
          open={formOpen}
          faq={editing}
          nextOrder={posts.length > 0 ? Math.max(...posts.map((p) => p.order)) + 1 : 0}
          onClose={() => setFormOpen(false)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t('adminContent.deleteFaq')}
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
