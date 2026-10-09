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
import type { PromoCode } from '@kidswear/core';
import { useDeletePromoCode, usePromoCodes } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate, formatPrice } from '@kidswear/utils';
import { PromoCodeDialog } from '@/components/admin/PromoCodeDialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { useNow } from '@/lib/useNow';

export default function AdminPromosPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const { data: promos = [], isLoading } = usePromoCodes();
  const remove = useDeletePromoCode();
  const [editing, setEditing] = useState<PromoCode | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<PromoCode | undefined>(undefined);
  const now = useNow();

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h2">{t('adminContent.promos')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          {t('adminContent.newPromo')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t('adminContent.promoNote')}
      </Typography>

      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        {isLoading ? (
          <TableSkeleton rows={3} columns={4} />
        ) : promos.length === 0 ? (
          <EmptyState title={t('adminContent.noPromos')} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('promo.label')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('promo.discount')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('adminContent.status')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {promos.map((p) => {
                  const expired = p.expiresAt !== undefined && p.expiresAt <= now;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {p.id}
                      </TableCell>
                      <TableCell>
                        {p.type === 'percent' ? `${p.value}%` : formatPrice(p.value, language)}
                        {p.minSubtotal > 0 && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t('adminContent.from', {
                              amount: formatPrice(p.minSubtotal, language),
                            })}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={p.active && !expired ? 'success' : 'default'}
                          label={
                            expired
                              ? t('promo.errors.expired')
                              : p.active
                                ? t('admin.active')
                                : t('admin.inactive')
                          }
                        />
                        {p.expiresAt !== undefined && !expired && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t('adminContent.until', { date: formatDate(p.expiresAt, language) })}
                          </Typography>
                        )}
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
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {formOpen && (
        <PromoCodeDialog open={formOpen} promo={editing} onClose={() => setFormOpen(false)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t('adminContent.deletePromo')}
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
