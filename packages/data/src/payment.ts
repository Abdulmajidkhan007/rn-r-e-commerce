import type { PaymentProvider } from '@kidswear/core';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
}

/**
 * In-app payment abstraction.
 *
 * This covers only providers that settle *inside* the app. Payme and Click do
 * not: the customer leaves for a hosted checkout and the money is confirmed
 * afterwards by the gateway calling our Cloud Function. A client can never
 * declare itself paid for those, so they take the redirect path instead — see
 * `paymentProviders.ts` for the checkout URLs and `functions/src/payments` for
 * the confirmation side.
 *
 * The mock remains useful: it lets the whole flow run with no gateway account
 * and keeps tests offline.
 */
export interface PaymentService {
  payDeposit(orderRef: string, amount: number): Promise<PaymentResult>;
}

/** Mock gateway: resolves success after a short delay. No card data collected. */
export const mockPaymentService: PaymentService = {
  payDeposit(orderRef: string, _amount: number): Promise<PaymentResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, transactionId: `mock_${orderRef}` });
      }, 800);
    });
  },
};

/** True when the provider settles inside the app rather than via a webhook. */
export function isInAppProvider(provider: PaymentProvider): boolean {
  return provider === 'mock';
}
