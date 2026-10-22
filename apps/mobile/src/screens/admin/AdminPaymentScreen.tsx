import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  HelperText,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CARD_NUMBER_DIGITS,
  PaymentSettingsSchema,
  formatCardNumber,
  normalizeCardNumber,
  type PaymentSettings,
} from '@kidswear/core';
import { usePaymentSettings, useSavePaymentSettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

/** Loads settings/payment, then mounts the form with them as initial values. */
export function AdminPaymentScreen(): React.ReactElement {
  const { data: settings, isLoading } = usePaymentSettings();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <PaymentForm initial={settings ?? null} />;
}

function PaymentForm({ initial }: { initial: PaymentSettings | null }): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
    >
      <Text variant="bodySmall" style={{ opacity: 0.75 }}>
        {t('transfer.settingsNote')}
      </Text>
      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text variant="bodyLarge" style={{ flex: 1 }}>
              {t('transfer.enabled')}
            </Text>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>
          <TextInput
            mode="outlined"
            label={t('transfer.cardNumber')}
            keyboardType="number-pad"
            placeholder="8600 0000 0000 0000"
            value={formatCardNumber(cardNumber)}
            onChangeText={(v) => setCardNumber(normalizeCardNumber(v).slice(0, CARD_NUMBER_DIGITS))}
          />
          <TextInput
            mode="outlined"
            label={t('transfer.cardHolder')}
            autoCapitalize="characters"
            maxLength={80}
            value={cardHolder}
            onChangeText={setCardHolder}
          />
          <TextInput
            mode="outlined"
            label={t('transfer.bank')}
            maxLength={80}
            value={bank}
            onChangeText={setBank}
          />
          <TextInput
            mode="outlined"
            label={t('transfer.note')}
            multiline
            maxLength={500}
            value={note}
            onChangeText={setNote}
          />
          <HelperText type="info" visible>
            {t('transfer.noteHint')}
          </HelperText>
          {status === 'saved' ? (
            <HelperText type="info" visible>
              {t('admin.saved')}
            </HelperText>
          ) : null}
          {status === 'invalid' ? (
            <HelperText type="error" visible>
              {t('transfer.invalid')}
            </HelperText>
          ) : null}
          {status === 'failed' ? (
            <HelperText type="error" visible>
              {t('adminContent.saveFailed')}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            loading={save.isPending}
            disabled={save.isPending}
            onPress={() => void submit()}
          >
            {t('admin.save')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
