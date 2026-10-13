import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeModePicker } from '@/components/ThemeModePicker';

/** Theme (system/light/dark) and language preferences. */
export function AppearanceSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card mode="outlined">
      <Card.Title title={t('settings.appearance')} titleVariant="titleMedium" />
      <Card.Content style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text variant="labelLarge">{t('settings.theme')}</Text>
          <ThemeModePicker />
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="labelLarge">{t('settings.language')}</Text>
          <LanguageSwitcher />
        </View>
      </Card.Content>
    </Card>
  );
}
