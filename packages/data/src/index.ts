/**
 * @kidswear/data — shared, platform-agnostic server-state layer (TanStack Query).
 *
 * Catalog READS only. Client state (cart/ui/auth) stays in Redux; real-time
 * onSnapshot is reserved for orders/admin in later phases. No UI imports.
 */
export { makeQueryClient } from './client';
export { queryKeys } from './queryKeys';
export type { ProductsParams, ProductSort } from './queryKeys';
export { useCategories, useProducts, useProduct, useProductsByIds } from './hooks';
export type { UseProductsResult } from './hooks';

export { mockPaymentService, isInAppProvider } from './payment';
export {
  buildCheckoutUrl,
  buildPaymeCheckoutUrl,
  buildClickCheckoutUrl,
  availableProviders,
  somToTiyin,
  tiyinToSom,
} from './paymentProviders';
export type {
  PaymentProviderConfig,
  PaymeConfig,
  ClickConfig,
  CheckoutUrlInput,
} from './paymentProviders';
export type { PaymentService, PaymentResult } from './payment';

export { useCheckout } from './useCheckout';
export type { CheckoutInput, CheckoutResult, UseCheckoutResult } from './useCheckout';

export { useUserOrders, useOrder, useCancelOrder } from './useOrders';
export type { UserOrdersState, OrderState, UseCancelOrderResult } from './useOrders';

export {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useAllOrders,
  useUpdateOrderStatus,
} from './useAdmin';
export type {
  CreateProductVars,
  UpdateProductVars,
  CreateCategoryVars,
  UpdateCategoryVars,
  AllOrdersState,
  UpdateOrderStatusVars,
} from './useAdmin';

export { summarizeDashboard, LOW_STOCK_THRESHOLD } from './dashboard';
export type { DashboardStats } from './dashboard';

export {
  contentKeys,
  useSendContactMessage,
  useContactMessages,
  useSetMessageStatus,
  useDeleteMessage,
  usePublishedPosts,
  useBlogPost,
  useAdminPosts,
  useSaveBlogPost,
  useDeleteBlogPost,
  useLookupPromo,
  usePromoCodes,
  useSavePromoCode,
  useDeletePromoCode,
  useDeliverySettings,
  useSaveDeliverySettings,
  useFavorites,
} from './useContent';
export type { FavoritesState } from './useContent';

export { summarizeSales } from './reports';
export type { SalesReport, SalesBucket, TopProduct } from './reports';

export { QueryClientProvider } from '@tanstack/react-query';
export type { QueryClient } from '@tanstack/react-query';
