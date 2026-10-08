import type { PaymentProviderConfig } from '@kidswear/data';

/**
 * Hosted-gateway credentials, inlined from .env at build time. A provider is
 * only offered at checkout when its ids are present, so a build without a
 * Payme or Click contract simply omits that option.
 *
 * These are public merchant identifiers. The keys that authorize webhook
 * callbacks live in Cloud Functions secrets (PAYME_MERCHANT_KEY,
 * CLICK_SECRET_KEY) and never ship in the bundle.
 */
const paymeMerchantId = process.env.RN_PUBLIC_PAYME_MERCHANT_ID;
const paymeAccountField = process.env.RN_PUBLIC_PAYME_ACCOUNT_FIELD;
const clickMerchantId = process.env.RN_PUBLIC_CLICK_MERCHANT_ID;
const clickServiceId = process.env.RN_PUBLIC_CLICK_SERVICE_ID;

export const paymentProviders: PaymentProviderConfig = {
  ...(paymeMerchantId
    ? {
        payme: {
          merchantId: paymeMerchantId,
          ...(paymeAccountField ? { accountField: paymeAccountField } : {}),
        },
      }
    : {}),
  ...(clickMerchantId && clickServiceId
    ? { click: { merchantId: clickMerchantId, serviceId: clickServiceId } }
    : {}),
};

/**
 * Deep link the gateway returns to. Requires the `kidswear` scheme to be
 * registered natively; until then the customer simply returns via the back
 * button and the order updates from the webhook regardless.
 */
export function checkoutReturnUrl(orderId: string): string {
  return `kidswear://checkout-success?orderId=${orderId}`;
}
