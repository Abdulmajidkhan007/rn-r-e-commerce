import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { formatCardNumber, type PaymentSettings } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice, type AppLocale } from '@kidswear/utils';

export interface TransferDetailsProps {
  settings: PaymentSettings;
  /** Deposit to transfer, UZS. */
  amount: number;
  language: AppLocale;
}

/** The shop's card and the deposit to send, with a copy button for the number. */
export function TransferDetails({
  settings,
  amount,
  language,
}: TransferDetailsProps): React.ReactElement {
  const { t } = useTranslation();
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyNumber = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(settings.cardNumber);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <Stack spacing={1.5} data-testid="transfer-details">
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t('transfer.cardNumber')}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography
            variant="h5"
            component="p"
            sx={{ fontFamily: 'monospace', letterSpacing: 1, wordBreak: 'break-all' }}
            data-testid="transfer-card-number"
          >
            {formatCardNumber(settings.cardNumber)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={copy === 'copied' ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={() => void copyNumber()}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}
          >
            {copy === 'copied' ? t('transfer.copied') : t('transfer.copy')}
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t('transfer.cardHolder')}: <strong>{settings.cardHolder}</strong>
        </Typography>
        {settings.bank && (
          <Typography variant="body2" color="text.secondary">
            {t('transfer.bank')}: {settings.bank}
          </Typography>
        )}
      </Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          {t('transfer.amount')}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {formatPrice(amount, language)}
        </Typography>
      </Stack>
      {settings.note && <Alert severity="info">{settings.note}</Alert>}
      {copy === 'failed' && <Alert severity="warning">{t('transfer.copyFailed')}</Alert>}
    </Stack>
  );
}
