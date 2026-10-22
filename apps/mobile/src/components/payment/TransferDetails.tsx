import { Share, View } from 'react-native';
import { Button, HelperText, Surface, Text, useTheme } from 'react-native-paper';
import { formatCardNumber, type PaymentSettings } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice, type AppLocale } from '@kidswear/utils';

export interface TransferDetailsProps {
  settings: PaymentSettings;
  /** Deposit to transfer, UZS. */
  amount: number;
  language: AppLocale;
}

/**
 * The shop's card and the deposit to send. React Native has no built-in
 * clipboard, so the number is selectable (long-press → Copy) and Share opens
 * the system sheet, which offers Copy on Android.
 */
export function TransferDetails({
  settings,
  amount,
  language,
}: TransferDetailsProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();

  const share = (): void => {
    void Share.share({ message: settings.cardNumber }).catch(() => undefined);
  };

  return (
    <View style={{ gap: 8 }}>
      <Surface
        mode="flat"
        style={{
          padding: 12,
          borderRadius: theme.roundness * 2,
          backgroundColor: theme.colors.surfaceVariant,
          gap: 4,
        }}
      >
        <Text variant="labelSmall" style={{ opacity: 0.7 }}>
          {t('transfer.cardNumber')}
        </Text>
        <Text
          selectable
          variant="headlineSmall"
          style={{ fontFamily: 'monospace', letterSpacing: 1 }}
        >
          {formatCardNumber(settings.cardNumber)}
        </Text>
        <Text variant="bodyMedium">
          {t('transfer.cardHolder')}:{' '}
          <Text style={{ fontWeight: '700' }}>{settings.cardHolder}</Text>
        </Text>
        {settings.bank ? (
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('transfer.bank')}: {settings.bank}
          </Text>
        ) : null}
        <Button
          mode="outlined"
          compact
          icon="share-variant"
          onPress={share}
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
        >
          {t('transfer.share')}
        </Button>
        <HelperText type="info" visible style={{ paddingHorizontal: 0 }}>
          {t('transfer.copyMobileHint')}
        </HelperText>
      </Surface>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
          {t('transfer.amount')}
        </Text>
        <Text variant="titleMedium" style={{ fontWeight: '800' }}>
          {formatPrice(amount, language)}
        </Text>
      </View>
      {settings.note ? <Text variant="bodySmall">{settings.note}</Text> : null}
    </View>
  );
}
