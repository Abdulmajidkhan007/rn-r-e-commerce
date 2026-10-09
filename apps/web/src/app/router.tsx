import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import CheckoutPage from '@/pages/CheckoutPage';
import ProfilePage from '@/pages/ProfilePage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import FavoritesPage from '@/pages/FavoritesPage';
import { RequireAuth, RequireAdmin } from './guards';

/** Wraps a default-exported page module for react-router's lazy `Component`. */
const lazyPage = (loader: () => Promise<{ default: React.ComponentType }>) => () =>
  loader().then((m) => ({ Component: m.default }));

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, lazy: lazyPage(() => import('@/pages/HomePage')) },
      { path: 'catalog', lazy: lazyPage(() => import('@/pages/CatalogPage')) },
      { path: 'product/:id', lazy: lazyPage(() => import('@/pages/ProductPage')) },
      { path: 'cart', lazy: lazyPage(() => import('@/pages/CartPage')) },
      {
        // Guarded route — kept eager so RequireAuth can wrap it directly.
        path: 'checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      { path: 'blog', lazy: lazyPage(() => import('@/pages/BlogPage')) },
      { path: 'blog/:slug', lazy: lazyPage(() => import('@/pages/BlogPostPage')) },
      { path: 'contact', lazy: lazyPage(() => import('@/pages/ContactPage')) },
      { path: 'privacy', lazy: lazyPage(() => import('@/pages/PrivacyPage')) },
      { path: 'terms', lazy: lazyPage(() => import('@/pages/TermsPage')) },
      { path: 'checkout/success', lazy: lazyPage(() => import('@/pages/CheckoutSuccessPage')) },
      {
        // Guarded route — kept eager so RequireAuth can wrap it directly.
        path: 'profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: 'favorites',
        element: (
          <RequireAuth>
            <FavoritesPage />
          </RequireAuth>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', lazy: lazyPage(() => import('@/pages/LoginPage')) },
      { path: 'register', lazy: lazyPage(() => import('@/pages/RegisterPage')) },
      {
        path: 'forgot-password',
        lazy: lazyPage(() => import('@/pages/ForgotPasswordPage')),
      },
    ],
  },
  {
    path: 'admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, lazy: lazyPage(() => import('@/pages/AdminDashboardPage')) },
      { path: 'products', lazy: lazyPage(() => import('@/pages/AdminProductsPage')) },
      { path: 'categories', lazy: lazyPage(() => import('@/pages/AdminCategoriesPage')) },
      { path: 'orders', lazy: lazyPage(() => import('@/pages/AdminOrdersPage')) },
      { path: 'reports', lazy: lazyPage(() => import('@/pages/AdminReportsPage')) },
      { path: 'messages', lazy: lazyPage(() => import('@/pages/AdminMessagesPage')) },
      { path: 'blog', lazy: lazyPage(() => import('@/pages/AdminBlogPage')) },
      { path: 'promos', lazy: lazyPage(() => import('@/pages/AdminPromosPage')) },
      { path: 'delivery', lazy: lazyPage(() => import('@/pages/AdminDeliveryPage')) },
    ],
  },
  { path: '*', lazy: lazyPage(() => import('@/pages/NotFoundPage')) },
];

export const router = createBrowserRouter(routes);
