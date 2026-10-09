import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider, makeQueryClient } from '@kidswear/data';
import './firebase';
import './i18n';
import './index.css';
import { StoreProvider } from '@/app/StoreProvider';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { AuthGate } from '@/app/AuthGate';
import { LanguageSync } from '@/app/LanguageSync';
import { FavoritesProvider } from '@/app/FavoritesProvider';
import { router } from '@/app/router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const queryClient = makeQueryClient();

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <LanguageSync />
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <AuthGate>
            <FavoritesProvider>
              <Suspense fallback={null}>
                <RouterProvider router={router} />
              </Suspense>
            </FavoritesProvider>
          </AuthGate>
        </AppThemeProvider>
      </QueryClientProvider>
    </StoreProvider>
  </StrictMode>,
);
