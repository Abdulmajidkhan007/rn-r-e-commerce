import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { makeStore, setLanguage } from '@kidswear/store';
import { initI18n, type SupportedLanguage } from '@kidswear/i18n';
import { AppThemeProvider } from '@/theme/ThemeProvider';

/**
 * In-memory persist storage. redux-persist needs a storage engine, and the real
 * web one touches localStorage, which leaks state between test files.
 */
function memoryStorage(): Parameters<typeof makeStore>[0] {
  const data = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Language to render in; defaults to uz (the app's fallback). */
  language?: SupportedLanguage;
}

export interface RenderWithProvidersResult extends RenderResult {
  store: ReturnType<typeof makeStore>['store'];
}

/**
 * Renders through the real store, i18n and theme providers rather than mocking
 * them, so assertions exercise the same wiring the app ships.
 */
export function renderWithProviders(
  ui: ReactElement,
  { language = 'uz', ...options }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const { store } = makeStore(memoryStorage());
  const i18n = initI18n({ language });
  void i18n.changeLanguage(language);
  store.dispatch(setLanguage(language));

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <AppThemeProvider>{children}</AppThemeProvider>
        </I18nextProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), store };
}
