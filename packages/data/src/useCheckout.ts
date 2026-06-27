import { useMutation } from '@tanstack/react-query';
import type { Address, CartItem } from '@kidswear/core';
import { createOrder, getProductById } from '@kidswear/firebase';
import { computeOrderTotals, genId } from '@kidswear/utils';
import { mockPaymentService, type PaymentService } from './payment';

export interface CheckoutInput {
  userId: string;
  items: CartItem[];
  shippingAddress: Address;
}

export interface CheckoutResult {
  orderId: string;
}

/** Thrown error keys are i18n keys; the UI resolves them. */
const ERR = {
  emptyCart: 'checkout.errors.emptyCart',
  noAddress: 'checkout.errors.noAddress',
  outOfStock: 'checkout.errors.outOfStock',
  payment: 'payment.failed',
  generic: 'checkout.errors.generic',
} as const;

const KNOWN = new Set<string>(Object.values(ERR));

function errorKey(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && KNOWN.has(error.message)) return error.message;
  return ERR.generic;
}

export interface UseCheckoutResult {
  checkout: (input: CheckoutInput) => Promise<CheckoutResult>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Places an order using the 50% deposit model. Runs the (stubbed) payment FIRST,
 * then writes the order in its FINAL state ('deposit_paid') in a single create —
 * because Firestore rules forbid client order updates. Read-only stock re-check;
 * the client never writes product stock (deferred to Cloud Functions).
 *
 * The caller clears the cart on success (keeps this package store-agnostic).
 */
export function useCheckout(payment: PaymentService = mockPaymentService): UseCheckoutResult {
  const mutation = useMutation<CheckoutResult, Error, CheckoutInput>({
    mutationFn: async ({ userId, items, shippingAddress }) => {
      if (items.length === 0) throw new Error(ERR.emptyCart);
      // shippingAddress is required by the type, but guard defensively.
      if (!shippingAddress.id) throw new Error(ERR.noAddress);

      // Read-only stock re-check against current Firestore state.
      const products = await Promise.all(items.map((i) => getProductById(i.productId)));
      const outOfStock = items.some((item, idx) => {
        const product = products[idx];
        return !product || item.quantity > product.stock;
      });
      if (outOfStock) throw new Error(ERR.outOfStock);

      const { subtotal, depositAmount, total } = computeOrderTotals(items);

      const payed = await payment.payDeposit(genId(), depositAmount);
      if (!payed.success) throw new Error(ERR.payment);

      const orderId = await createOrder({
        userId,
        items,
        subtotal,
        depositAmount,
        paidAmount: depositAmount,
        total,
        status: 'deposit_paid',
        shippingAddress,
      });

      return { orderId };
    },
  });

  return {
    checkout: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: errorKey(mutation.error),
    reset: mutation.reset,
  };
}
