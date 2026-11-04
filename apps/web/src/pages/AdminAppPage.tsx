import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { AppSettings } from '@kidswear/core';
import { useAppSettings, useSaveMinVersion } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

/** Admin: the latest Android release (read-only) and the forced-update minimum. */
export default function AdminAppPage(): React.ReactElement {
  const { data, isLoading } = useAppSettings();
  if (isLoading) return <TableSkeleton rows={3} columns={2} />;
  return <AppForm settings={data ?? null} />;
}

function AppForm({ settings }: { settings: AppSettings | null }): React.ReactElement {
  const { t } = useTranslation();
  const save = useSaveMinVersion();
  const [min, setMin] = useState(
    settings?.minVersionCode !== undefined ? String(settings.minVersionCode) : '',
  );
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle');

  const submit = async (): Promise<void> => {
    const trimmed = min.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      setStatus('invalid');
      return;
    }
    try {
      await save.mutateAsync(value);
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  const latest =
    settings?.latestVersionCode !== undefined
      ? `${settings.latestVersionName ?? ''} (${settings.latestVersionCode})`.trim()
      : t('adminApp.none');

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{t('adminApp.title')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('adminApp.note')}
      </Typography>
      {status === 'saved' && <Alert severity="success">{t('adminApp.saved')}</Alert>}
      {status === 'invalid' && <Alert severity="error">{t('adminApp.invalid')}</Alert>}
      {status === 'failed' && <Alert severity="error">{t('adminContent.saveFailed')}</Alert>}
      <Card>
        <Stack spacing={2}>
          <Typography>
            {t('adminApp.latest')}: <strong>{latest}</strong>
          </Typography>
          <TextField
            type="number"
            label={t('adminApp.minLabel')}
            helperText={t('adminApp.minHint')}
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={save.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('admin.save')}
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
