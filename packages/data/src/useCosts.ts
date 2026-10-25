import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { OrderCost, ProductCost, ProductCostInput, UserProfile } from '@kidswear/core';
import {
  backfillOrderCost,
  getAllUsers,
  getOrderCosts,
  getProductCosts,
  setProductCost,
} from '@kidswear/firebase';

/** Admin-only reads (rules refuse everyone else). */
export const costKeys = {
  productCosts: ['productCosts'] as const,
  orderCosts: ['orderCosts'] as const,
  users: ['adminUsers'] as const,
};

/** Admin: product costs keyed by product id. */
export function useProductCosts(): UseQueryResult<Map<string, ProductCost>> {
  return useQuery({
    queryKey: costKeys.productCosts,
    queryFn: async () => new Map((await getProductCosts()).map((c) => [c.id, c])),
  });
}

export interface SaveProductCostVars {
  productId: string;
  input: ProductCostInput;
  by: string;
}

export function useSaveProductCost(): UseMutationResult<void, Error, SaveProductCostVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input, by }: SaveProductCostVars) =>
      setProductCost(productId, input, by),
    onSuccess: () => qc.invalidateQueries({ queryKey: costKeys.productCosts }),
  });
}

/** Admin: order cost snapshots keyed by order id. */
export function useOrderCosts(): UseQueryResult<Map<string, OrderCost>> {
  return useQuery({
    queryKey: costKeys.orderCosts,
    queryFn: async () => new Map((await getOrderCosts()).map((c) => [c.id, c])),
  });
}

export interface BackfillOrderCostsVars {
  orderIds: readonly string[];
  by: string;
}

/** Admin: snapshots today's costs for confirmed orders that have none. Resolves to how many were written. */
export function useBackfillOrderCosts(): UseMutationResult<number, Error, BackfillOrderCostsVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderIds, by }: BackfillOrderCostsVars) => {
      let written = 0;
      for (const id of orderIds) if (await backfillOrderCost(id, by)) written++;
      return written;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: costKeys.orderCosts }),
  });
}

/** Admin: every user profile (Spark: one read per user, joined with orders on the client). */
export function useAllUsers(): UseQueryResult<UserProfile[]> {
  return useQuery({ queryKey: costKeys.users, queryFn: getAllUsers });
}
