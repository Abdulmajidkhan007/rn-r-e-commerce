import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Order } from '@kidswear/core';
import { subscribeOrder, subscribeOrdersByUser, updateOrderStatus } from '@kidswear/firebase';

export interface UserOrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

/**
 * Real-time list of the current user's orders via Firestore `onSnapshot`. This
 * is the real-time path, intentionally distinct from the TanStack Query catalog
 * hooks — they coexist (cached reads for the catalog, live updates for orders).
 */
export function useUserOrders(uid: string | undefined): UserOrdersState {
  // setState happens only inside the subscription callback (external system),
  // never synchronously in the effect body.
  const [state, setState] = useState<UserOrdersState>({
    orders: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeOrdersByUser(uid, (orders) => {
      setState({ orders, loading: false, error: null });
    });
    return () => {
      unsubscribe();
    };
  }, [uid]);

  return state;
}

export interface OrderState {
  order: Order | null;
  loading: boolean;
  error: string | null;
}

/** Real-time single order via `onSnapshot` (owner/admin per rules). */
export function useOrder(id: string | undefined): OrderState {
  const [state, setState] = useState<OrderState>({ order: null, loading: true, error: null });

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeOrder(id, (order) => {
      setState({ order, loading: false, error: null });
    });
    return () => {
      unsubscribe();
    };
  }, [id]);

  return state;
}

export interface UseCancelOrderResult {
  cancel: (id: string) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

/**
 * Owner-cancel mutation. Should only be offered for pending/deposit_paid orders;
 * Firestore rules enforce that an owner may only transition to 'cancelled'.
 */
export function useCancelOrder(): UseCancelOrderResult {
  const mutation = useMutation({
    mutationFn: (id: string) => updateOrderStatus(id, 'cancelled'),
  });
  return {
    cancel: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? 'orders.cancelError' : null,
  };
}
