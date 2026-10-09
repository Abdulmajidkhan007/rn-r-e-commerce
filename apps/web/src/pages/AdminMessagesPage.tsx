import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneIcon from '@mui/icons-material/Done';
import type { ContactMessage } from '@kidswear/core';
import { useContactMessages, useDeleteMessage, useSetMessageStatus } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

export default function AdminMessagesPage(): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const { data: messages = [], isLoading } = useContactMessages();
  const setStatus = useSetMessageStatus();
  const remove = useDeleteMessage();
  const [deleting, setDeleting] = useState<ContactMessage | undefined>(undefined);
  const unread = messages.filter((m) => m.status === 'new').length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h2">{t('adminContent.messages')}</Typography>
        {unread > 0 && <Chip color="primary" label={t('adminContent.unread', { count: unread })} />}
      </Stack>

      {isLoading ? (
        <TableSkeleton rows={4} columns={1} />
      ) : messages.length === 0 ? (
        <EmptyState title={t('adminContent.noMessages')} />
      ) : (
        messages.map((m) => (
          <Card
            key={m.id}
            variant="outlined"
            sx={{ boxShadow: 'none', borderColor: m.status === 'new' ? 'primary.main' : 'divider' }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {m.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(m.createdAt, language)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Link href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>{m.phone}</Link>
                  {m.email && <Link href={`mailto:${m.email}`}>{m.email}</Link>}
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {m.message}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {m.status === 'new' && (
                    <Button
                      size="small"
                      startIcon={<DoneIcon />}
                      onClick={() => setStatus.mutate({ id: m.id, status: 'read' })}
                    >
                      {t('adminContent.markRead')}
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleting(m)}
                  >
                    {t('adminContent.delete')}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t('adminContent.deleteMessage')}
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
