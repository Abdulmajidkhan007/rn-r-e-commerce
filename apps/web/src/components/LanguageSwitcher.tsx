import { useEffect } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import { useAppDispatch, useAppSelector, setLanguage } from '@kidswear/store';
import { supportedLanguages, type SupportedLanguage, useTranslation } from '@kidswear/i18n';

const LABELS: Record<SupportedLanguage, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};

/** Switches the active language, persisted via uiSlice and applied to i18next. */
export function LanguageSwitcher(): React.ReactElement {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);
  const { i18n } = useTranslation();

  // Keep i18next in sync with the persisted preference.
  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const handleChange = (e: SelectChangeEvent): void => {
    dispatch(setLanguage(e.target.value as SupportedLanguage));
  };

  return (
    <Select
      value={language}
      onChange={handleChange}
      size="small"
      aria-label="language"
      sx={{ minWidth: 120 }}
    >
      {supportedLanguages.map((lng) => (
        <MenuItem key={lng} value={lng}>
          {LABELS[lng]}
        </MenuItem>
      ))}
    </Select>
  );
}
