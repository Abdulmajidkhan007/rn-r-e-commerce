import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './firebase';
import './i18n';
import './index.css';
import { StoreProvider } from '@/app/StoreProvider';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { AuthGate } from '@/app/AuthGate';
import { router } from '@/app/router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <AppThemeProvider>
        <AuthGate>
          <Suspense fallback={null}>
            <RouterProvider router={router} />
          </Suspense>
        </AuthGate>
      </AppThemeProvider>
    </StoreProvider>
  </StrictMode>,
);
