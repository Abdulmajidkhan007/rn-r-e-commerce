import { useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, HelperText, Text } from 'react-native-paper';
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
import { TransferDetails } from '@/components/payment/TransferDetails';
import { compressProductImage, pickImage } from '@/lib/image';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { ReceiptImageModal } from './ReceiptImageModal';
import { ReceiptStatusChip } from './ReceiptStatusChip';
import { ReceiptThumb } from './ReceiptThumb';

export interface ReceiptsSectionProps {
  order: Order;
  userId: string;
  language: AppLocale;
}

/** Customer side of a card-transfer order: card, upload, live receipt statuses. */
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
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const block = receiptUploadBlock(order, receipts);
  const left = MAX_RECEIPTS_PER_ORDER - receipts.length;
  const awaitingPayment = order.status === 'pending';

  const pickAndUpload = async (): Promise<void> => {
    setError(null);
    setSent(false);
    const uri = await pickImage();
    if (!uri) return;
    setBusy(true);
    try {
      const image = await compressProductImage(uri);
      await upload.mutateAsync({ order, existing: receipts, userId, image });
      setSent(true);
    } catch (e) {
      setError(receiptErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 10 }}>
        <Text variant="titleMedium">
          {awaitingPayment ? t('transfer.title') : t('receipts.paidVia')}
        </Text>
        {awaitingPayment ? (
          <>
            <Text variant="bodySmall" style={{ opacity: 0.75 }}>
              {t('transfer.instructions')}
            </Text>
            {settings && isCardNumber(settings.cardNumber) ? (
              <TransferDetails
                settings={settings}
                amount={order.depositAmount}
                language={language}
              />
            ) : (
              <HelperText type="error" visible>
                {t('transfer.unavailable')}
              </HelperText>
            )}
            <Divider />
          </>
        ) : null}

        <Text variant="titleSmall">{t('receipts.title')}</Text>
        {loading ? (
          <ActivityIndicator style={{ alignSelf: 'flex-start' }} />
        ) : receipts.length === 0 ? (
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('receipts.empty')}
          </Text>
        ) : (
          receipts.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <ReceiptThumb src={r.data} onOpen={() => setViewing(r.data)} />
              <View style={{ flex: 1, gap: 4 }}>
                <ReceiptStatusChip status={r.status} />
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                  {formatDateTime(r.createdAt, language)}
                </Text>
                {r.status === 'rejected' && r.note ? (
                  <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
                    {t('receipts.rejectedReason', { note: r.note })}
                  </HelperText>
                ) : null}
              </View>
            </View>
          ))
        )}

        {sent ? (
          <HelperText type="info" visible>
            {t('receipts.uploaded')}
          </HelperText>
        ) : null}
        {error ? (
          <HelperText type="error" visible>
            {tk(error)}
          </HelperText>
        ) : null}

        {!block ? (
          <>
            <Button
              mode="contained"
              icon="file-upload-outline"
              loading={busy}
              disabled={busy || loading}
              onPress={() => void pickAndUpload()}
            >
              {busy
                ? t('receipts.uploading')
                : receipts.length > 0
                  ? t('receipts.uploadAnother')
                  : t('receipts.upload')}
            </Button>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {t('receipts.hint')} {t('receipts.left', { count: left })}
            </Text>
          </>
        ) : null}
        {block === 'limit' ? (
          <HelperText type="error" visible>
            {t('receipts.errors.limit')}
          </HelperText>
        ) : null}
      </Card.Content>
      <ReceiptImageModal src={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
