import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  MAX_RECEIPTS_PER_ORDER,
  isCardNumber,
  receiptUploadBlock,
  type Order,
} from '@kidswear/core';
import {
  receiptErrorKey,
  useOrderReceipts,
  usePaymentSettings,
  useUploadReceipt,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatDateTime, type AppLocale } from '@kidswear/utils';
import { Card } from '@/components/Card';
import { TransferDetails } from '@/components/payment/TransferDetails';
import { compressProductImage, pickImageFile } from '@/lib/image';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { ReceiptImageDialog } from './ReceiptImageDialog';
import { ReceiptStatusChip } from './ReceiptStatusChip';
import { ReceiptThumb } from './ReceiptThumb';

export interface ReceiptsSectionProps {
  order: Order;
  userId: string;
  language: AppLocale;
}

/**
 * Customer side of a card-transfer order: the card to pay, the upload button
 * and the live status of every receipt sent (the admin's verdict arrives via
 * the snapshot listener).
 */
export function ReceiptsSection({
  order,
  userId,
  language,
}: ReceiptsSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { receipts, loading } = useOrderReceipts(order.id, userId);
  const { data: settings } = usePaymentSettings();
  const upload = useUploadReceipt();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const block = receiptUploadBlock(order, receipts);
  const left = MAX_RECEIPTS_PER_ORDER - receipts.length;
  const awaitingPayment = order.status === 'pending';

  const pickAndUpload = async (): Promise<void> => {
    setError(null);
    setSent(false);
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    try {
      const image = await compressProductImage(file);
      await upload.mutateAsync({ order, existing: receipts, userId, image });
      setSent(true);
    } catch (e) {
      setError(receiptErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack spacing={2} data-testid="receipts-section">
        <Typography variant="h6">
          {awaitingPayment ? t('transfer.title') : t('receipts.paidVia')}
        </Typography>

        {awaitingPayment && (
          <>
            <Typography variant="body2" color="text.secondary">
              {t('transfer.instructions')}
            </Typography>
            {/* Shown even if transfers were switched off after this order was placed. */}
            {settings && isCardNumber(settings.cardNumber) ? (
              <TransferDetails
                settings={settings}
                amount={order.depositAmount}
                language={language}
              />
            ) : (
              <Alert severity="warning">{t('transfer.unavailable')}</Alert>
            )}
            <Divider />
          </>
        )}

        <Typography variant="subtitle2">{t('receipts.title')}</Typography>
        {loading ? (
          <CircularProgress size={24} />
        ) : receipts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('receipts.empty')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {receipts.map((r) => (
              <Stack
                key={r.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
                data-testid="receipt-row"
              >
                <ReceiptThumb src={r.data} onOpen={() => setViewing(r.data)} />
                <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                  <ReceiptStatusChip status={r.status} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(r.createdAt, language)}
                  </Typography>
                  {r.status === 'rejected' && r.note && (
                    <Typography variant="body2" color="error">
                      {t('receipts.rejectedReason', { note: r.note })}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}

        {sent && <Alert severity="success">{t('receipts.uploaded')}</Alert>}
        {error && <Alert severity="error">{tk(error)}</Alert>}

        {!block && (
          <Stack spacing={0.5}>
            <Button
              variant="contained"
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
              disabled={busy || loading}
              onClick={() => void pickAndUpload()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {busy
                ? t('receipts.uploading')
                : receipts.length > 0
                  ? t('receipts.uploadAnother')
                  : t('receipts.upload')}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {t('receipts.hint')} {t('receipts.left', { count: left })}
            </Typography>
          </Stack>
        )}
        {block === 'limit' && <Alert severity="warning">{t('receipts.errors.limit')}</Alert>}
      </Stack>
      <ReceiptImageDialog src={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
