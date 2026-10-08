import { useMutation } from '@tanstack/react-query';
import type { Address, CartItem, PaymentProvider } from '@kidswear/core';
import { createOrder, getProductById } from '@kidswear/firebase';
import { computeOrderTotals, genId } from '@kidswear/utils';
import { mockPaymentService, type PaymentService } from './payment';
import { buildCheckoutUrl, type PaymentProviderConfig } from './paymentProviders';

export interface CheckoutInput {
  userId: string;
  items: CartItem[];
  shippingAddress: Address;
  /** Defaults to the in-app mock so existing callers keep working. */
  provider?: PaymentProvider;
  /**
   * Where a hosted gateway returns the customer. Built from the order id, which
   * only exists after the order is created — hence a function, not a string.
   */
  returnUrl?: (orderId: string) => string;
}

export interface CheckoutResult {
  orderId: string;
  /**
   * Present only for hosted gateways. The caller must send the customer here;
   * the order stays `pending` until the provider's webhook confirms it.
   */
  checkoutUrl?: string;
}

/** Thrown error keys are i18n keys; the UI resolves them. */
const ERR = {
  emptyCart: 'checkout.errors.emptyCart',
  noAddress: 'checkout.errors.noAddress',
  outOfStock: 'checkout.errors.outOfStock',
  payment: 'payment.failed',
  providerUnavailable: 'payment.providerUnavailable',
  generic: 'checkout.errors.generic',
} as const;

const KNOWN = new Set<string>(Object.values(ERR));

function errorKey(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && KNOWN.has(error.message)) return error.message;
  return ERR.generic;
}

export interface UseCheckoutOptions {
  /** In-app gateway used when provider is 'mock'. */
  payment?: PaymentService;
  /** Hosted gateway credentials; unconfigured providers are rejected. */
  providers?: PaymentProviderConfig;
}

export interface UseCheckoutResult {
  checkout: (input: CheckoutInput) => Promise<CheckoutResult>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Places an order under the 50% deposit model.
 *
 * Two paths, both ending in a single client-side create — Firestore rules
 * forbid clients from updating orders at all:
 *
 * - **Hosted gateway (payme/click):** create the order as `pending` with
 *   `paidAmount: 0`, then hand back a checkout URL. Only the provider's webhook
 *   (Cloud Function, admin SDK) may flip it to `deposit_paid`. The client
 *   watches the order via `useOrder`'s snapshot listener and reacts when the
 *   server confirms.
 * - **Mock:** settle in-app first, then create the order already
 *   `deposit_paid`, matching what the rules accept for a paid create.
 *
 * Stock is re-checked read-only; the client never writes product stock (that is
 * the Functions' job).
 */
export function useCheckout(options: UseCheckoutOptions | PaymentService = {}): UseCheckoutResult {
  // Back-compat: the original signature took a PaymentService directly.
  const resolved: UseCheckoutOptions =
    'payDeposit' in options ? { payment: options as PaymentService } : options;
  const payment = resolved.payment ?? mockPaymentService;
  const providers = resolved.providers ?? {};

  const mutation = useMutation<CheckoutResult, Error, CheckoutInput>({
    mutationFn: async ({ userId, items, shippingAddress, provider = 'mock', returnUrl }) => {
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
      const base = { userId, items, subtotal, depositAmount, total, shippingAddress };

      if (provider === 'mock') {
        const payed = await payment.payDeposit(genId(), depositAmount);
        if (!payed.success) throw new Error(ERR.payment);

        const orderId = await createOrder({
          ...base,
          paidAmount: depositAmount,
          status: 'deposit_paid',
          payment: {
            provider: 'mock',
            state: 'paid',
            ...(payed.transactionId ? { transactionId: payed.transactionId } : {}),
          },
        });
        return { orderId };
      }

      // Hosted gateway: the order exists before the customer pays, so the
      // provider has something to reference, and so an abandoned checkout is
      // visible to admins rather than lost.
      const orderId = await createOrder({
        ...base,
        paidAmount: 0,
        status: 'pending',
        payment: { provider, state: 'created' },
      });

      const checkoutUrl = buildCheckoutUrl(provider, providers, {
        orderId,
        amountSom: depositAmount,
        returnUrl: returnUrl?.(orderId) ?? '',
      });
      if (!checkoutUrl) throw new Error(ERR.providerUnavailable);

      return { orderId, checkoutUrl };
    },
  });

  return {
    checkout: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: errorKey(mutation.error),
    reset: mutation.reset,
  };
}
