import type { PaymentProviderConfig } from '@kidswear/data';

const env = import.meta.env;

/**
 * Hosted-gateway credentials from the environment. A provider is only offered
 * at checkout when its ids are present, so a deployment without a Payme or
 * Click contract simply does not show that option — no broken redirect.
 *
 * These are public merchant identifiers, not secrets: the keys that authorize
 * webhook callbacks live in Cloud Functions secrets (PAYME_MERCHANT_KEY,
 * CLICK_SECRET_KEY) and never reach the client.
 */
export const paymentProviders: PaymentProviderConfig = {
  ...(env.VITE_PAYME_MERCHANT_ID
    ? {
        payme: {
          merchantId: env.VITE_PAYME_MERCHANT_ID,
          ...(env.VITE_PAYME_ACCOUNT_FIELD ? { accountField: env.VITE_PAYME_ACCOUNT_FIELD } : {}),
          ...(env.VITE_PAYME_CHECKOUT_URL ? { checkoutBaseUrl: env.VITE_PAYME_CHECKOUT_URL } : {}),
        },
      }
    : {}),
  ...(env.VITE_CLICK_MERCHANT_ID && env.VITE_CLICK_SERVICE_ID
    ? {
        click: {
          merchantId: env.VITE_CLICK_MERCHANT_ID,
          serviceId: env.VITE_CLICK_SERVICE_ID,
          ...(env.VITE_CLICK_CHECKOUT_URL ? { checkoutBaseUrl: env.VITE_CLICK_CHECKOUT_URL } : {}),
        },
      }
    : {}),
};

/** Where a gateway sends the customer back after checkout. */
export function checkoutReturnUrl(orderId: string): string {
  return `${window.location.origin}/checkout/success?orderId=${orderId}`;
}
