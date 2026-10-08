import { z } from 'zod';

/**
 * Payment providers for the 50% deposit. Both are Uzbek gateways that drive the
 * merchant from their side: the customer is sent to the provider's checkout, and
 * the provider then calls our Cloud Function to confirm. `mock` keeps the
 * original stubbed flow available for local development and tests.
 */
export const PaymentProviderSchema = z.enum(['payme', 'click', 'mock']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

/**
 * Lifecycle of a deposit charge, as tracked on the order.
 *
 * `created` is written by the client before it hands off to the gateway;
 * everything after that is written server-side by the webhook, which is the only
 * component allowed to declare money received.
 */
export const PaymentStateSchema = z.enum(['created', 'paid', 'cancelled']);
export type PaymentState = z.infer<typeof PaymentStateSchema>;

export const OrderPaymentSchema = z.object({
  provider: PaymentProviderSchema,
  state: PaymentStateSchema,
  /** The provider's own transaction id, set once they create a transaction. */
  transactionId: z.string().optional(),
  /** Provider-side creation time in epoch millis, as reported by the gateway. */
  createdAt: z.number().int().nonnegative().optional(),
  paidAt: z.number().int().nonnegative().optional(),
  cancelledAt: z.number().int().nonnegative().optional(),
  /** Provider's numeric cancellation reason, kept verbatim for support. */
  cancelReason: z.number().int().optional(),
});

export type OrderPayment = z.infer<typeof OrderPaymentSchema>;
