import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  isTrashed,
  type Order,
  type OrderStatus,
  type Product,
  type StockMove,
} from '@kidswear/core';
import {
  adjustStock,
  changeOrderStatus,
  createCategory,
  createProduct,
  deleteCategory,
  bulkUpdateProducts,
  deleteProduct,
  hideProductsWithoutImages,
  importProducts,
  purgeExpiredProducts,
  restoreProduct,
  trashProduct,
  getProducts,
  getStockMoves,
  subscribeAllOrders,
  updateCategory,
  updateProduct,
  type CategoryInput,
  type BulkProductAction,
  type ImportProductsResult,
  type ProductInput,
  type StatusChangeResult,
  type StockAdjustment,
} from '@kidswear/firebase';

const PRODUCTS_KEY = ['products'] as const;
const ADMIN_PRODUCTS_KEY = ['products', 'admin'] as const;
const CATEGORIES_KEY = ['categories'] as const;
const STOCK_MOVES_KEY = ['stockMoves'] as const;

// --- Admin product read (ALL products, including inactive) ---

/**
 * Fetches every product (active and inactive) for the admin catalog. Distinct
 * from the storefront `useProducts`, which restricts to active products. The
 * key is nested under `['products']` so product mutations invalidate it too.
 */
export function useAdminProducts(): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: ADMIN_PRODUCTS_KEY,
    queryFn: () => getProducts(),
    // Trashed products live on their own list ("O'chirilganlar").
    select: (products) => products.filter((p) => !isTrashed(p)),
  });
}

/** The trash: soft-deleted products. Shares the admin fetch (same key). */
export function useTrashedProducts(): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: ADMIN_PRODUCTS_KEY,
    queryFn: () => getProducts(),
    select: (products) => products.filter(isTrashed),
  });
}

// --- Product mutations (invalidate the catalog query cache) ---

export interface CreateProductVars {
  id: string;
  input: ProductInput;
}
export function useCreateProduct(): UseMutationResult<void, Error, CreateProductVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: CreateProductVars) => createProduct(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export interface UpdateProductVars {
  id: string;
  patch: Partial<ProductInput>;
}
export function useUpdateProduct(): UseMutationResult<void, Error, UpdateProductVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateProductVars) => updateProduct(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/** "Delete" in the admin = move to the trash (soft delete). */
export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trashProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useRestoreProduct(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/** Permanent delete from the trash. */
export function usePurgeProduct(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function usePurgeExpiredProducts(): UseMutationResult<number, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => purgeExpiredProducts(),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export interface BulkProductVars {
  ids: readonly string[];
  action: BulkProductAction;
}
export function useBulkUpdateProducts(): UseMutationResult<number, Error, BulkProductVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action }: BulkProductVars) => bulkUpdateProducts(ids, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useHideProductsWithoutImages(): UseMutationResult<number, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => hideProductsWithoutImages(),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useImportProducts(): UseMutationResult<
  ImportProductsResult,
  Error,
  Parameters<typeof importProducts>[0]
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items) => importProducts(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

// --- Category mutations ---

export interface CreateCategoryVars {
  id: string;
  input: CategoryInput;
}
export function useCreateCategory(): UseMutationResult<void, Error, CreateCategoryVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: CreateCategoryVars) => createCategory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export interface UpdateCategoryVars {
  id: string;
  patch: Partial<CategoryInput>;
}
export function useUpdateCategory(): UseMutationResult<void, Error, UpdateCategoryVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateCategoryVars) => updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

// --- Admin orders (real-time onSnapshot, distinct from cached catalog reads) ---

export interface AllOrdersState {
  orders: Order[];
  loading: boolean;
}

/** Real-time list of ALL orders (admin), optionally filtered by status. */
export function useAllOrders(statusFilter?: OrderStatus): AllOrdersState {
  const [state, setState] = useState<AllOrdersState>({ orders: [], loading: true });

  useEffect(() => {
    const unsubscribe = subscribeAllOrders((orders) => {
      setState({ orders, loading: false });
    }, statusFilter);
    return () => {
      unsubscribe();
    };
  }, [statusFilter]);

  return state;
}

export interface UpdateOrderStatusVars {
  id: string;
  status: OrderStatus;
  /** Admin uid, recorded on the stock journal rows. */
  by: string;
}

/** Stock moved: refresh every cached product read and the journal. */
function invalidateStock(qc: ReturnType<typeof useQueryClient>): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
    qc.invalidateQueries({ queryKey: ['product'] }),
    qc.invalidateQueries({ queryKey: STOCK_MOVES_KEY }),
  ]).then(() => undefined);
}

/**
 * Admin status change. Confirming an order takes its stock, cancelling a
 * confirmed one returns it — in one transaction (see `changeOrderStatus`).
 * Fails with `InventoryError` (status unchanged) when stock runs short.
 */
export function useUpdateOrderStatus(): UseMutationResult<
  StatusChangeResult,
  Error,
  UpdateOrderStatusVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, by }: UpdateOrderStatusVars) => changeOrderStatus(id, status, by),
    onSuccess: (result) => (result.action === 'none' ? undefined : invalidateStock(qc)),
  });
}

// --- Warehouse (Ombor) ---

/** Newest stock journal rows (admin). */
export function useStockMoves(): UseQueryResult<StockMove[]> {
  return useQuery({ queryKey: STOCK_MOVES_KEY, queryFn: () => getStockMoves() });
}

/** Intake / write-off / inventory count on one variant; resolves to the applied delta. */
export function useAdjustStock(): UseMutationResult<number, Error, StockAdjustment> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: () => invalidateStock(qc),
  });
}
