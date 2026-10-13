import { useState } from 'react';
import { Button, Menu } from 'react-native-paper';
import { useAppDispatch, useAppSelector, setLanguage } from '@kidswear/store';
import { supportedLanguages, useTranslation } from '@kidswear/i18n';
import { LANGUAGE_LABELS } from './LanguageSwitcher';

const NATIVE_NAMES = {
  uz: 'Oʻzbekcha',
  en: 'English',
  ru: 'Русский',
} as const;

/** Compact header language picker: the current code opens a menu of languages. */
export function LanguageMenu(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);
  const [open, setOpen] = useState(false);

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchorPosition="bottom"
      anchor={
        <Button
          compact
          icon="translate"
          onPress={() => setOpen(true)}
          accessibilityLabel={t('settings.changeLanguage')}
        >
          {LANGUAGE_LABELS[language]}
        </Button>
      }
    >
      {supportedLanguages.map((lng) => (
        <Menu.Item
          key={lng}
          title={NATIVE_NAMES[lng]}
          leadingIcon={lng === language ? 'check' : undefined}
          onPress={() => {
            dispatch(setLanguage(lng));
            setOpen(false);
          }}
        />
      ))}
    </Menu>
  );
}
