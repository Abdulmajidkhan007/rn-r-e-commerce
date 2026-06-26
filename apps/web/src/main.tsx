import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './firebase';
import './i18n';
import './index.css';
import { StoreProvider } from '@/app/StoreProvider';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { router } from '@/app/router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <AppThemeProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </AppThemeProvider>
    </StoreProvider>
  </StrictMode>,
);
