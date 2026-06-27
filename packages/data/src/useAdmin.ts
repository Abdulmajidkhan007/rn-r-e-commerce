import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Order, OrderStatus, Product } from '@kidswear/core';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProducts,
  subscribeAllOrders,
  updateCategory,
  updateOrderStatus,
  updateProduct,
  type CategoryInput,
  type ProductInput,
} from '@kidswear/firebase';

const PRODUCTS_KEY = ['products'] as const;
const ADMIN_PRODUCTS_KEY = ['products', 'admin'] as const;
const CATEGORIES_KEY = ['categories'] as const;

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

export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
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
}
export function useUpdateOrderStatus(): UseMutationResult<void, Error, UpdateOrderStatusVars> {
  return useMutation({
    mutationFn: ({ id, status }: UpdateOrderStatusVars) => updateOrderStatus(id, status),
  });
}
