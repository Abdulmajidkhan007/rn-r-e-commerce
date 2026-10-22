import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  CARD_NUMBER_DIGITS,
  PaymentSettingsSchema,
  formatCardNumber,
  normalizeCardNumber,
  type PaymentSettings,
} from '@kidswear/core';
import { usePaymentSettings, useSavePaymentSettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';
import { TableSkeleton } from '@/components/admin/TableSkeleton';

/** Loads settings/payment, then mounts the form with them as its initial values. */
export default function AdminPaymentPage(): React.ReactElement {
  const { data: settings, isLoading } = usePaymentSettings();
  if (isLoading) return <TableSkeleton rows={4} columns={2} />;
  return <PaymentForm initial={settings ?? null} />;
}

function PaymentForm({ initial }: { initial: PaymentSettings | null }): React.ReactElement {
  const { t } = useTranslation();
  const save = useSavePaymentSettings();
  const [enabled, setEnabled] = useState(initial?.transferEnabled ?? false);
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber ?? '');
  const [cardHolder, setCardHolder] = useState(initial?.cardHolder ?? '');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle');

  const submit = async (): Promise<void> => {
    const parsed = PaymentSettingsSchema.safeParse({
      transferEnabled: enabled,
      cardNumber,
      cardHolder: cardHolder.trim(),
      bank: bank.trim(),
      note: note.trim(),
    });
    if (!parsed.success) {
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
      <Typography variant="h2">{t('adminContent.payment')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('transfer.settingsNote')}
      </Typography>
      {status === 'saved' && <Alert severity="success">{t('admin.saved')}</Alert>}
      {status === 'invalid' && <Alert severity="error">{t('transfer.invalid')}</Alert>}
      {status === 'failed' && <Alert severity="error">{t('adminContent.saveFailed')}</Alert>}

      <Card>
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label={t('transfer.enabled')}
          />
          <TextField
            label={t('transfer.cardNumber')}
            value={formatCardNumber(cardNumber)}
            onChange={(e) =>
              setCardNumber(normalizeCardNumber(e.target.value).slice(0, CARD_NUMBER_DIGITS))
            }
            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
            placeholder="8600 0000 0000 0000"
          />
          <TextField
            label={t('transfer.cardHolder')}
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label={t('transfer.bank')}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label={t('transfer.note')}
            helperText={t('transfer.noteHint')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
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
