import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import {
  TV_MAX_SECONDS,
  TV_MIN_SECONDS,
  TV_SOURCES,
  TvSettingsSchema,
  type TvSettings,
  type TvSource,
} from '@kidswear/core';
import { useCategories, useSaveTvSettings, useTvSettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { useLocalized } from '@/lib/useLocalized';

/** Admin: what the store TV (/tv) shows and how long each slide stays. */
export default function AdminTvPage(): React.ReactElement {
  const settings = useTvSettings();
  if (!settings) return <TableSkeleton rows={3} columns={2} />;
  return <TvForm initial={settings} />;
}

function TvForm({ initial }: { initial: TvSettings }): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const categories = useCategories();
  const save = useSaveTvSettings();
  const [source, setSource] = useState<TvSource>(initial.source);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? '');
  const [seconds, setSeconds] = useState(String(initial.slideSeconds));
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle');

  const submit = async (): Promise<void> => {
    const parsed = TvSettingsSchema.safeParse({
      source,
      slideSeconds: Number(seconds),
      ...(source === 'category' && categoryId ? { categoryId } : {}),
    });
    if (!parsed.success || (source === 'category' && !categoryId)) {
      setStatus('invalid');
      return;
    }
    try {
      await save.mutateAsync(parsed.data);
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{t('adminTv.title')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('adminTv.note')}
      </Typography>
      {status === 'saved' && <Alert severity="success">{t('adminTv.saved')}</Alert>}
      {status === 'invalid' && <Alert severity="error">{t('adminTv.invalid')}</Alert>}
      {status === 'failed' && <Alert severity="error">{t('adminContent.saveFailed')}</Alert>}
      <Card>
        <Stack spacing={2}>
          <TextField
            select
            label={t('adminTv.source')}
            value={source}
            onChange={(e) => setSource(e.target.value as TvSource)}
          >
            {TV_SOURCES.map((s) => (
              <MenuItem key={s} value={s}>
                {t(`adminTv.${s}`)}
              </MenuItem>
            ))}
          </TextField>
          {source === 'category' && (
            <TextField
              select
              label={t('adminTv.categoryLabel')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {(categories.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {localized(c.name)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            type="number"
            label={t('adminTv.seconds')}
            helperText={t('adminTv.secondsHint')}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            slotProps={{ htmlInput: { min: TV_MIN_SECONDS, max: TV_MAX_SECONDS } }}
          />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => void submit()} disabled={save.isPending}>
              {t('admin.save')}
            </Button>
            <Button component="a" href="/tv" target="_blank" rel="noopener">
              {t('adminTv.open')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
