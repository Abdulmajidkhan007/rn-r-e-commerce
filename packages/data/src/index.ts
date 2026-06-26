/**
 * @kidswear/data — shared, platform-agnostic server-state layer (TanStack Query).
 *
 * Catalog READS only. Client state (cart/ui/auth) stays in Redux; real-time
 * onSnapshot is reserved for orders/admin in later phases. No UI imports.
 */
export { makeQueryClient } from './client';
export { queryKeys } from './queryKeys';
export type { ProductsParams, ProductSort } from './queryKeys';
export { useCategories, useProducts, useProduct } from './hooks';
export type { UseProductsResult } from './hooks';

export { QueryClientProvider } from '@tanstack/react-query';
export type { QueryClient } from '@tanstack/react-query';
