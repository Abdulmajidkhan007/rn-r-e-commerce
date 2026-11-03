import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTranslation } from '@kidswear/i18n';
import { useAppDispatch, useAppSelector, toggleTheme } from '@kidswear/store';

/** Toggles between light and dark, persisted via uiSlice. */
export function ThemeToggle(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  return (
    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
      <IconButton
        onClick={() => dispatch(toggleTheme())}
        aria-label={t('a11y.toggleTheme')}
        color="inherit"
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
