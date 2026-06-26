import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider } from '@mui/material/styles';
import { useAppSelector } from '@kidswear/store';
import { createAppTheme } from './muiTheme';

type ResolvedScheme = 'light' | 'dark';

function useSystemScheme(): ResolvedScheme {
  const [scheme, setScheme] = useState<ResolvedScheme>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent): void => {
      setScheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => {
      mq.removeEventListener('change', handler);
    };
  }, []);

  return scheme;
}

/**
 * Wires the shared `ui.theme` preference to MUI. `StyledEngineProvider`
 * with `enableCssLayer` emits MUI styles into the `mui` cascade layer so
 * Tailwind utilities win.
 */
export function AppThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const preference = useAppSelector((s) => s.ui.theme);
  const systemScheme = useSystemScheme();
  const resolved: ResolvedScheme =
    preference === 'system' ? systemScheme : preference;

  const theme = useMemo(() => createAppTheme(resolved), [resolved]);

  useEffect(() => {
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.dataset['theme'] = resolved;
  }, [resolved]);

  return (
    <StyledEngineProvider enableCssLayer>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
}
