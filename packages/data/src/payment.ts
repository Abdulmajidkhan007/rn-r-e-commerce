export interface PaymentResult {
  success: boolean;
  transactionId?: string;
}

/**
 * Payment gateway abstraction. The deposit is charged through this interface so
 * a real provider (Payme/Click/Stripe) can replace the mock without touching
 * checkout logic. A real impl would typically create a 'pending' order and have
 * a server webhook/Function confirm payment — see DECISIONS.md.
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
