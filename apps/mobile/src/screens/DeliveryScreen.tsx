import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UZ_REGIONS } from '@kidswear/core';
import { useDeliverySettings, useDeliveryText } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice, pickLocalized } from '@kidswear/utils';

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

export function DeliveryScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useAppSelector((s) => s.ui.language);
  const { data: settings, isLoading } = useDeliverySettings();
  const text = useDeliveryText(language);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
      <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
        {t('deliveryPage.subtitle')}
      </Text>

      {!settings ? (
        <Text variant="bodyMedium">{t('deliveryPage.notSet')}</Text>
      ) : (
        <>
          <Card mode="outlined">
            <Card.Content style={{ gap: 6 }}>
              <Text variant="titleMedium">{text.summary}</Text>
              {text.free ? <Text variant="bodyMedium">{text.free}</Text> : null}
              {text.min ? <Text variant="bodyMedium">{text.min}</Text> : null}
            </Card.Content>
          </Card>
          <Card mode="outlined">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">{t('deliveryPage.byRegion')}</Text>
              {UZ_REGIONS.filter((r) => settings.regions[r.id] !== undefined).map((r) => (
                <Row
                  key={r.id}
                  label={pickLocalized(r.name, language)}
                  value={formatPrice(settings.regions[r.id] ?? 0, language)}
                />
              ))}
              <Row
                label={t('deliveryPage.otherRegions')}
                value={formatPrice(settings.defaultFee, language)}
              />
            </Card.Content>
          </Card>
        </>
      )}

      <Card mode="outlined">
        <Card.Content style={{ gap: 6 }}>
          <Text variant="titleMedium">{t('deliveryPage.howTitle')}</Text>
          <Text variant="bodyMedium">• {t('deliveryPage.how1')}</Text>
          <Text variant="bodyMedium">• {t('deliveryPage.how2')}</Text>
          <Text variant="bodyMedium">• {t('deliveryPage.how3')}</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
