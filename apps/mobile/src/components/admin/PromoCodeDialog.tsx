import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  normalizePromoCode,
  PromoCodeSchema,
  type PromoCode,
  type PromoType,
} from '@kidswear/core';
import { useSavePromoCode } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

/** 'YYYY-MM-DD' (end of that day, Tashkent) ↔ epoch millis — same as the web admin. */
const TZ = 5 * 60 * 60 * 1000;
const toDateInput = (ms?: number): string =>
  ms === undefined ? '' : new Date(ms + TZ - 1).toISOString().slice(0, 10);
const fromDateInput = (v: string): number | undefined =>
  /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? Date.parse(`${v}T00:00:00Z`) + 24 * 60 * 60 * 1000 - TZ
    : undefined;

export function PromoCodeDialog({
  visible,
  promo,
  onDismiss,
}: {
  visible: boolean;
  promo?: PromoCode;
  onDismiss: () => void;
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
    if (expires && fromDateInput(expires) === undefined) {
      setError(t('adminContent.promoInvalid'));
      return;
    }
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
      onDismiss();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>
          {promo ? t('adminContent.editPromo') : t('adminContent.newPromo')}
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView
            contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
            <TextInput
              mode="outlined"
              label={t('promo.label')}
              value={code}
              disabled={!!promo}
              autoCapitalize="characters"
              maxLength={20}
              onChangeText={(v) => setCode(normalizePromoCode(v))}
            />
            <HelperText type="info" visible>
              {t('adminContent.promoCodeHint')}
            </HelperText>
            <SegmentedButtons
              value={type}
              onValueChange={(v) => setType(v as PromoType)}
              buttons={[
                { value: 'percent', label: t('adminContent.percent') },
                { value: 'fixed', label: t('adminContent.fixed') },
              ]}
            />
            <TextInput
              mode="outlined"
              label={type === 'percent' ? '%' : 'UZS'}
              keyboardType="number-pad"
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^\d]/g, ''))}
            />
            <TextInput
              mode="outlined"
              label={t('adminContent.minSubtotal')}
              keyboardType="number-pad"
              value={minSubtotal}
              onChangeText={(v) => setMinSubtotal(v.replace(/[^\d]/g, ''))}
            />
            <TextInput
              mode="outlined"
              label={`${t('adminContent.expiresAt')} (YYYY-MM-DD)`}
              placeholder="2026-12-31"
              value={expires}
              onChangeText={setExpires}
            />
            <HelperText type="info" visible>
              {t('adminContent.expiresHint')}
            </HelperText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text>{t('admin.active')}</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('admin.cancel')}</Button>
          <Button loading={save.isPending} disabled={save.isPending} onPress={() => void submit()}>
            {t('admin.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
