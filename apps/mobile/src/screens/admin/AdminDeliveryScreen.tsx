import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeliverySettingsSchema, UZ_REGIONS, type DeliverySettings } from '@kidswear/core';
import { useDeliverySettings, useSaveDeliverySettings } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { pickLocalized } from '@kidswear/utils';

/** Loads settings, then mounts the form with them as initial values. */
export function AdminDeliveryScreen(): React.ReactElement {
  const { data: settings, isLoading } = useDeliverySettings();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <DeliveryForm initial={settings ?? null} />;
}

const digits = (v: string): string => v.replace(/[^\d]/g, '');

function DeliveryForm({ initial }: { initial: DeliverySettings | null }): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const save = useSaveDeliverySettings();
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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
    >
      <Text variant="bodySmall" style={{ opacity: 0.75 }}>
        {initial ? t('adminContent.deliveryNote') : t('adminContent.deliveryNotSet')}
      </Text>
      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          <TextInput
            mode="outlined"
            label={`${t('adminContent.defaultFee')}, UZS`}
            keyboardType="number-pad"
            value={defaultFee}
            onChangeText={(v) => setDefaultFee(digits(v))}
          />
          <TextInput
            mode="outlined"
            label={`${t('adminContent.freeFrom')}, UZS`}
            keyboardType="number-pad"
            value={freeFrom}
            onChangeText={(v) => setFreeFrom(digits(v))}
          />
          <HelperText type="info" visible>
            {t('adminContent.freeFromHint')}
          </HelperText>
          <Text variant="titleSmall">{t('adminContent.regionFees')}</Text>
          {UZ_REGIONS.map((r) => (
            <TextInput
              key={r.id}
              mode="outlined"
              dense
              label={pickLocalized(r.name, language)}
              placeholder={defaultFee || '0'}
              keyboardType="number-pad"
              value={regions[r.id] ?? ''}
              onChangeText={(v) => setRegions((prev) => ({ ...prev, [r.id]: digits(v) }))}
            />
          ))}
          {status === 'saved' ? (
            <HelperText type="info" visible>
              {t('admin.saved')}
            </HelperText>
          ) : null}
          {status === 'invalid' ? (
            <HelperText type="error" visible>
              {t('adminContent.deliveryInvalid')}
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
