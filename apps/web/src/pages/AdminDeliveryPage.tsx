import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import { DeliverySettingsSchema, UZ_REGIONS, type DeliverySettings } from '@kidswear/core';
import { useDeliverySettings, useSaveDeliverySettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { pickLocalized } from '@kidswear/utils';
import { Card } from '@/components';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

const som = { input: { endAdornment: <InputAdornment position="end">UZS</InputAdornment> } };

/** Loads the settings, then mounts the form with them as its initial values. */
export default function AdminDeliveryPage(): React.ReactElement {
  const { data: settings, isLoading } = useDeliverySettings();
  if (isLoading) return <TableSkeleton rows={6} columns={2} />;
  return <DeliveryForm initial={settings ?? null} />;
}

/** Empty region field = use the default fee (the region is not stored). */
function DeliveryForm({ initial }: { initial: DeliverySettings | null }): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const save = useSaveDeliverySettings();
  const settings = initial;
  const [defaultFee, setDefaultFee] = useState(initial ? String(initial.defaultFee) : '');
  const [freeFrom, setFreeFrom] = useState(initial ? String(initial.freeFrom) : '0');
  const [regions, setRegions] = useState<Record<string, string>>(() =>
    initial
      ? Object.fromEntries(Object.entries(initial.regions).map(([k, v]) => [k, String(v)]))
      : {},
  );
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle');

  const submit = async (): Promise<void> => {
    const parsed = DeliverySettingsSchema.safeParse({
      defaultFee: Number(defaultFee),
      freeFrom: Number(freeFrom || 0),
      regions: Object.fromEntries(
        Object.entries(regions)
          .filter(([, v]) => v.trim() !== '')
          .map(([k, v]) => [k, Number(v)]),
      ),
    });
    if (defaultFee.trim() === '' || !parsed.success) {
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
      <Typography variant="h2">{t('adminContent.delivery')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {settings ? t('adminContent.deliveryNote') : t('adminContent.deliveryNotSet')}
      </Typography>
      {status === 'saved' && <Alert severity="success">{t('admin.saved')}</Alert>}
      {status === 'invalid' && <Alert severity="error">{t('adminContent.deliveryInvalid')}</Alert>}
      {status === 'failed' && <Alert severity="error">{t('adminContent.saveFailed')}</Alert>}

      <Card>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="number"
              label={t('adminContent.defaultFee')}
              value={defaultFee}
              onChange={(e) => setDefaultFee(e.target.value)}
              slotProps={som}
            />
            <TextField
              fullWidth
              type="number"
              label={t('adminContent.freeFrom')}
              helperText={t('adminContent.freeFromHint')}
              value={freeFrom}
              onChange={(e) => setFreeFrom(e.target.value)}
              slotProps={som}
            />
          </Stack>
          <Typography variant="subtitle2">{t('adminContent.regionFees')}</Typography>
          <Grid container spacing={2}>
            {UZ_REGIONS.map((r) => (
              <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={pickLocalized(r.name, language)}
                  placeholder={defaultFee || '0'}
                  value={regions[r.id] ?? ''}
                  onChange={(e) => setRegions((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  slotProps={som}
                />
              </Grid>
            ))}
          </Grid>
          <Button
            variant="contained"
            size="large"
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
