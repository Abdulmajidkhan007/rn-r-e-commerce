import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import {
  normalizePromoCode,
  PromoCodeSchema,
  type PromoCode,
  type PromoType,
} from '@kidswear/core';
import { useSavePromoCode } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

/** 'YYYY-MM-DD' (end of that day, Tashkent) ↔ epoch millis. */
const TZ = 5 * 60 * 60 * 1000;
const toDateInput = (ms?: number) =>
  ms === undefined ? '' : new Date(ms + TZ - 1).toISOString().slice(0, 10);
const fromDateInput = (v: string) =>
  v ? Date.parse(`${v}T00:00:00Z`) + 24 * 60 * 60 * 1000 - TZ : undefined;

export function PromoCodeDialog({
  open,
  promo,
  onClose,
}: {
  open: boolean;
  promo?: PromoCode;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const save = useSavePromoCode();
  const [code, setCode] = useState(promo?.id ?? '');
  const [type, setType] = useState<PromoType>(promo?.type ?? 'percent');
  const [value, setValue] = useState(String(promo?.value ?? 10));
  const [minSubtotal, setMinSubtotal] = useState(String(promo?.minSubtotal ?? 0));
  const [expires, setExpires] = useState(toDateInput(promo?.expiresAt));
  const [active, setActive] = useState(promo?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setError(null);
    const expiresAt = fromDateInput(expires);
    const input = {
      id: normalizePromoCode(code),
      type,
      value: Number(value),
      minSubtotal: Number(minSubtotal),
      active,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    };
    const valid =
      PromoCodeSchema.safeParse({ ...input, createdAt: 0, updatedAt: 0 }).success &&
      (type === 'fixed' || input.value <= 90);
    if (!valid) {
      setError(t('adminContent.promoInvalid'));
      return;
    }
    try {
      await save.mutateAsync({ input, isNew: !promo });
      onClose();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{promo ? t('adminContent.editPromo') : t('adminContent.newPromo')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('promo.label')}
            value={code}
            disabled={!!promo}
            helperText={t('adminContent.promoCodeHint')}
            onChange={(e) => setCode(normalizePromoCode(e.target.value))}
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              select
              fullWidth
              label={t('adminContent.promoType')}
              value={type}
              onChange={(e) => setType(e.target.value as PromoType)}
            >
              <MenuItem value="percent">{t('adminContent.percent')}</MenuItem>
              <MenuItem value="fixed">{t('adminContent.fixed')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              type="number"
              label={type === 'percent' ? '%' : 'UZS'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Stack>
          <TextField
            type="number"
            label={t('adminContent.minSubtotal')}
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
          />
          <TextField
            type="date"
            label={t('adminContent.expiresAt')}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            helperText={t('adminContent.expiresHint')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControlLabel
            control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label={t('admin.active')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={save.isPending}>
          {t('admin.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
