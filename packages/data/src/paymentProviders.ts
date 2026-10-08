import type { PaymentProvider } from '@kidswear/core';

/**
 * Checkout-URL builders for the Uzbek gateways.
 *
 * Both providers work the same way at this layer: we send the customer to a
 * hosted checkout page carrying the merchant id, the amount and our order id.
 * Nothing here is authoritative — the money is only ever confirmed by the
 * webhook the provider calls afterwards (see functions/src/payments). Keeping
 * these as pure functions makes the encoding directly testable, which matters
 * because a malformed parameter surfaces as a blank gateway page.
 */

export interface CheckoutUrlInput {
  /** Our order document id — the account key both gateways echo back. */
  orderId: string;
  /** Deposit in UZS integer som. */
  amountSom: number;
  /** Where the gateway returns the customer afterwards. */
  returnUrl: string;
}

export interface PaymeConfig {
  merchantId: string;
  /** Account field name configured in the Payme merchant cabinet. */
  accountField?: string;
  /** Override for testing against Payme's sandbox. */
  checkoutBaseUrl?: string;
}

export interface ClickConfig {
  merchantId: string;
  serviceId: string;
  checkoutBaseUrl?: string;
}

const PAYME_CHECKOUT = 'https://checkout.paycom.uz';
const CLICK_CHECKOUT = 'https://my.click.uz/services/pay';

/** Payme bills in tiyin; 1 som = 100 tiyin. */
export const TIYIN_PER_SOM = 100;

export function somToTiyin(amountSom: number): number {
  return Math.round(amountSom * TIYIN_PER_SOM);
}

export function tiyinToSom(amountTiyin: number): number {
  return Math.round(amountTiyin / TIYIN_PER_SOM);
}

/**
 * Payme takes its parameters as a base64-encoded `;`-separated string appended
 * to the checkout host, e.g. `m=<id>;ac.order_id=<id>;a=<tiyin>;c=<return>`.
 */
export function buildPaymeCheckoutUrl(config: PaymeConfig, input: CheckoutUrlInput): string {
  const accountField = config.accountField ?? 'order_id';
  const params = [
    `m=${config.merchantId}`,
    `ac.${accountField}=${input.orderId}`,
    `a=${somToTiyin(input.amountSom)}`,
    `c=${input.returnUrl}`,
  ].join(';');

  const encoded = base64Encode(params);
  return `${config.checkoutBaseUrl ?? PAYME_CHECKOUT}/${encoded}`;
}

/** Click takes plain query parameters and bills in som. */
export function buildClickCheckoutUrl(config: ClickConfig, input: CheckoutUrlInput): string {
  const url = new URL(config.checkoutBaseUrl ?? CLICK_CHECKOUT);
  url.searchParams.set('service_id', config.serviceId);
  url.searchParams.set('merchant_id', config.merchantId);
  url.searchParams.set('amount', String(input.amountSom));
  url.searchParams.set('transaction_param', input.orderId);
  url.searchParams.set('return_url', input.returnUrl);
  return url.toString();
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Self-contained base64 over UTF-8 bytes.
 *
 * Neither `Buffer` (Node-only) nor `btoa` (absent from some Hermes builds, and
 * byte-oriented anyway) is safe to assume in a package imported by both the web
 * app and React Native. Encoding the UTF-8 bytes ourselves keeps the output
 * identical everywhere, which matters because Payme rejects a malformed payload
 * with a blank page rather than an error.
 */
export function base64Encode(value: string): string {
  const bytes = utf8Bytes(value);
  let out = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);

    out += B64_ALPHABET[(triple >> 18) & 63];
    out += B64_ALPHABET[(triple >> 12) & 63];
    out += b1 === undefined ? '=' : B64_ALPHABET[(triple >> 6) & 63];
    out += b2 === undefined ? '=' : B64_ALPHABET[triple & 63];
  }

  return out;
}

function utf8Bytes(value: string): number[] {
  const bytes: number[] = [];
  for (const char of value) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return bytes;
}

export interface PaymentProviderConfig {
  payme?: PaymeConfig;
  click?: ClickConfig;
}

/**
 * Resolves the hosted-checkout URL for the chosen provider, or null when that
 * provider is not configured — the UI uses null to hide the option rather than
 * sending the customer to a broken page.
 */
export function buildCheckoutUrl(
  provider: PaymentProvider,
  config: PaymentProviderConfig,
  input: CheckoutUrlInput,
): string | null {
  if (provider === 'payme') {
    return config.payme ? buildPaymeCheckoutUrl(config.payme, input) : null;
  }
  if (provider === 'click') {
    return config.click ? buildClickCheckoutUrl(config.click, input) : null;
  }
  // 'mock' never leaves the app.
  return null;
}

/** Providers that are actually configured, in display order. */
export function availableProviders(config: PaymentProviderConfig): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  if (config.payme) providers.push('payme');
  if (config.click) providers.push('click');
  return providers;
}
