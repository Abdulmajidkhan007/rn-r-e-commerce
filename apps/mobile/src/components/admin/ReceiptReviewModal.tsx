import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECEIPT_NOTE_MAX, type Order } from '@kidswear/core';
import { receiptErrorKey, useOrderReceipts, useReviewReceipt } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatDateTime, formatPrice, type AppLocale } from '@kidswear/utils';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { ReceiptImageModal } from '@/components/receipts/ReceiptImageModal';
import { ReceiptStatusChip } from '@/components/receipts/ReceiptStatusChip';
import { ReceiptThumb } from '@/components/receipts/ReceiptThumb';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface ReceiptReviewModalProps {
  order: Order | null;
  adminUid: string;
  language: AppLocale;
  onClose: () => void;
  onDone: (text: string) => void;
}

/**
 * Admin review of a transfer order's receipts. Approve flips the receipt and
 * the order (`deposit_paid`) in one transaction; reject needs a reason.
 */
export function ReceiptReviewModal({
  order,
  adminUid,
  language,
  onClose,
  onDone,
}: ReceiptReviewModalProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
    <Portal>
      <Modal
        visible={order !== null}
        onDismiss={close}
        contentContainerStyle={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 12 }}
        >
          <Text variant="titleLarge">
            {t('receipts.reviewTitle')} · #{order?.id.slice(0, 8)}
          </Text>
          {order ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <OrderStatusChip status={order.status} />
              <Text variant="bodyMedium">
                {t('cart.deposit')}: {formatPrice(order.depositAmount, language)}
              </Text>
            </View>
          ) : null}
          {error ? (
            <HelperText type="error" visible>
              {tk(error)}
            </HelperText>
          ) : null}
          {loading ? (
            <ActivityIndicator />
          ) : receipts.length === 0 ? (
            <Text style={{ opacity: 0.7 }}>{t('receipts.empty')}</Text>
          ) : (
            receipts.map((r, i) => (
              <View key={r.id} style={{ gap: 8 }}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ReceiptThumb src={r.data} size={104} onOpen={() => setViewing(r.data)} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <ReceiptStatusChip status={r.status} />
                    <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                      {formatDateTime(r.createdAt, language)}
                    </Text>
                    {r.note ? (
                      <Text variant="bodySmall">
                        {t('receipts.rejectedReason', { note: r.note })}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {r.status === 'pending' && rejecting !== r.id ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      mode="contained"
                      icon="check"
                      disabled={review.isPending || order?.status !== 'pending'}
                      onPress={() => void decide(r.id, 'approved')}
                    >
                      {t('receipts.approve')}
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      textColor={theme.colors.error}
                      disabled={review.isPending}
                      onPress={() => {
                        setRejecting(r.id);
                        setNote('');
                      }}
                    >
                      {t('receipts.reject')}
                    </Button>
                  </View>
                ) : null}
                {rejecting === r.id ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      mode="outlined"
                      label={t('receipts.rejectReason')}
                      value={note}
                      onChangeText={setNote}
                      multiline
                      maxLength={RECEIPT_NOTE_MAX}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        mode="contained"
                        buttonColor={theme.colors.error}
                        textColor={theme.colors.onError}
                        disabled={review.isPending || note.trim() === ''}
                        onPress={() => void decide(r.id, 'rejected')}
                      >
                        {t('receipts.reject')}
                      </Button>
                      <Button onPress={() => setRejecting(null)}>{t('actions.cancel')}</Button>
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
        <Button mode="contained-tonal" onPress={close} style={{ marginHorizontal: 16 }}>
          {t('receipts.close')}
        </Button>
        <ReceiptImageModal src={viewing} onClose={() => setViewing(null)} />
      </Modal>
    </Portal>
  );
}
