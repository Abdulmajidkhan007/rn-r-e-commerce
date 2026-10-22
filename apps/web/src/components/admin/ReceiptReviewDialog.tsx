import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { RECEIPT_NOTE_MAX, type Order } from '@kidswear/core';
import { receiptErrorKey, useOrderReceipts, useReviewReceipt } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatDateTime, formatPrice, type AppLocale } from '@kidswear/utils';
import { ReceiptImageDialog } from '@/components/receipts/ReceiptImageDialog';
import { ReceiptStatusChip } from '@/components/receipts/ReceiptStatusChip';
import { ReceiptThumb } from '@/components/receipts/ReceiptThumb';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface ReceiptReviewDialogProps {
  order: Order | null;
  adminUid: string;
  language: AppLocale;
  onClose: () => void;
  onDone: (text: string) => void;
}

/**
 * Admin review of a transfer order's receipts. Approve marks the receipt and
 * the order (`deposit_paid`, `paidAmount = depositAmount`) in one transaction;
 * reject needs a reason the customer will see.
 */
export function ReceiptReviewDialog({
  order,
  adminUid,
  language,
  onClose,
  onDone,
}: ReceiptReviewDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { receipts, loading } = useOrderReceipts(order?.id, adminUid, true);
  const review = useReviewReceipt();
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setRejecting(null);
    setNote('');
    setError(null);
    onClose();
  };

  const decide = async (receiptId: string, decision: 'approved' | 'rejected'): Promise<void> => {
    setError(null);
    try {
      await review.mutateAsync({
        receiptId,
        decision,
        by: adminUid,
        ...(decision === 'rejected' ? { note } : {}),
      });
      setRejecting(null);
      setNote('');
      onDone(decision === 'approved' ? t('receipts.approved') : t('receipts.rejected'));
    } catch (e) {
      setError(receiptErrorKey(e));
    }
  };

  return (
    <Dialog open={order !== null} onClose={close} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('receipts.reviewTitle')} · #{order?.id.slice(0, 8)}
      </DialogTitle>
      <DialogContent dividers>
        {order && (
          <Stack spacing={2} data-testid="receipt-review">
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <OrderStatusChip status={order.status} />
              <Typography variant="body2">
                {t('cart.deposit')}: <strong>{formatPrice(order.depositAmount, language)}</strong>
              </Typography>
            </Stack>
            {error && <Alert severity="error">{tk(error)}</Alert>}
            {loading ? (
              <CircularProgress size={24} />
            ) : receipts.length === 0 ? (
              <Typography color="text.secondary">{t('receipts.empty')}</Typography>
            ) : (
              receipts.map((r, i) => (
                <Stack key={r.id} spacing={1.5}>
                  {i > 0 && <Divider />}
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <ReceiptThumb src={r.data} size={112} onOpen={() => setViewing(r.data)} />
                    <Stack spacing={0.75} sx={{ minWidth: 0, flexGrow: 1 }}>
                      <ReceiptStatusChip status={r.status} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(r.createdAt, language)}
                      </Typography>
                      {r.note && (
                        <Typography variant="body2" color="text.secondary">
                          {t('receipts.rejectedReason', { note: r.note })}
                        </Typography>
                      )}
                      <Button
                        size="small"
                        onClick={() => setViewing(r.data)}
                        sx={{ alignSelf: 'flex-start', px: 0 }}
                      >
                        {t('receipts.view')}
                      </Button>
                    </Stack>
                  </Stack>
                  {r.status === 'pending' && rejecting !== r.id && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleOutlinedIcon />}
                        disabled={review.isPending || order.status !== 'pending'}
                        onClick={() => void decide(r.id, 'approved')}
                      >
                        {t('receipts.approve')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<HighlightOffIcon />}
                        disabled={review.isPending}
                        onClick={() => {
                          setRejecting(r.id);
                          setNote('');
                        }}
                      >
                        {t('receipts.reject')}
                      </Button>
                    </Stack>
                  )}
                  {rejecting === r.id && (
                    <Stack spacing={1}>
                      <TextField
                        autoFocus
                        size="small"
                        label={t('receipts.rejectReason')}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: RECEIPT_NOTE_MAX } }}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="error"
                          disabled={review.isPending || note.trim() === ''}
                          onClick={() => void decide(r.id, 'rejected')}
                        >
                          {t('receipts.reject')}
                        </Button>
                        <Button onClick={() => setRejecting(null)}>{t('actions.cancel')}</Button>
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              ))
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('receipts.close')}</Button>
      </DialogActions>
      <ReceiptImageDialog src={viewing} onClose={() => setViewing(null)} />
    </Dialog>
  );
}
