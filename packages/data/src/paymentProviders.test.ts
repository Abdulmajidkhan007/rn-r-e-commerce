import { describe, expect, it } from 'vitest';
import {
  availableProviders,
  base64Encode,
  buildCheckoutUrl,
  buildClickCheckoutUrl,
  buildPaymeCheckoutUrl,
  somToTiyin,
  tiyinToSom,
} from './paymentProviders';

const payme = { merchantId: 'M123' };
const click = { merchantId: 'C1', serviceId: 'S1' };
const input = {
  orderId: 'order-abc',
  amountSom: 150_000,
  returnUrl: 'https://kidswear.uz/checkout-success',
};

function decodePayme(url: string): string {
  const encoded = url.slice(url.lastIndexOf('/') + 1);
  // atob is byte-oriented; re-decode the bytes as UTF-8.
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

describe('base64Encode', () => {
  it('matches the platform encoder for ASCII', () => {
    for (const value of ['', 'a', 'ab', 'abc', 'abcd', 'm=M1;a=100']) {
      expect(base64Encode(value)).toBe(btoa(value));
    }
  });

  it('pads to a multiple of four characters', () => {
    expect(base64Encode('a')).toHaveLength(4);
    expect(base64Encode('ab')).toHaveLength(4);
    expect(base64Encode('abcd')).toHaveLength(8);
  });

  it('encodes multi-byte UTF-8 rather than mangling it', () => {
    // A Cyrillic or apostrophe-bearing return URL must survive the round trip.
    const value = "c=https://kidswear.uz/koʻylak?q=шапка";
    const binary = atob(base64Encode(value));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(value);
  });
});

describe('som/tiyin conversion', () => {
  it('converts som to tiyin — Payme bills in the minor unit', () => {
    expect(somToTiyin(150_000)).toBe(15_000_000);
  });

  it('round-trips whole som', () => {
    expect(tiyinToSom(somToTiyin(99_500))).toBe(99_500);
  });

  it('never emits a fractional tiyin', () => {
    // A float would be rejected by the gateway outright.
    expect(Number.isInteger(somToTiyin(33_333))).toBe(true);
  });

  it('handles zero', () => {
    expect(somToTiyin(0)).toBe(0);
  });
});

describe('buildPaymeCheckoutUrl', () => {
  it('encodes merchant, account, amount and return url', () => {
    const decoded = decodePayme(buildPaymeCheckoutUrl(payme, input));
    expect(decoded).toContain('m=M123');
    expect(decoded).toContain('ac.order_id=order-abc');
    expect(decoded).toContain('a=15000000');
    expect(decoded).toContain('c=https://kidswear.uz/checkout-success');
  });

  it('sends the amount in tiyin, not som', () => {
    // Sending som would undercharge by 100x — the single most costly bug here.
    expect(decodePayme(buildPaymeCheckoutUrl(payme, input))).not.toContain('a=150000;');
  });

  it('separates parameters with semicolons', () => {
    expect(decodePayme(buildPaymeCheckoutUrl(payme, input)).split(';')).toHaveLength(4);
  });

  it('honours a custom account field from the merchant cabinet', () => {
    const decoded = decodePayme(
      buildPaymeCheckoutUrl({ ...payme, accountField: 'buyurtma' }, input),
    );
    expect(decoded).toContain('ac.buyurtma=order-abc');
  });

  it('points at the production checkout host by default', () => {
    expect(buildPaymeCheckoutUrl(payme, input)).toMatch(/^https:\/\/checkout\.paycom\.uz\//);
  });

  it('accepts a sandbox host override', () => {
    const url = buildPaymeCheckoutUrl({ ...payme, checkoutBaseUrl: 'https://test.paycom.uz' }, input);
    expect(url).toMatch(/^https:\/\/test\.paycom\.uz\//);
  });
});

describe('buildClickCheckoutUrl', () => {
  it('sets the query parameters Click expects', () => {
    const url = new URL(buildClickCheckoutUrl(click, input));
    expect(url.searchParams.get('service_id')).toBe('S1');
    expect(url.searchParams.get('merchant_id')).toBe('C1');
    expect(url.searchParams.get('transaction_param')).toBe('order-abc');
    expect(url.searchParams.get('return_url')).toBe('https://kidswear.uz/checkout-success');
  });

  it('bills in som — Click does not use tiyin', () => {
    expect(new URL(buildClickCheckoutUrl(click, input)).searchParams.get('amount')).toBe('150000');
  });

  it('url-encodes the return url rather than breaking the query string', () => {
    const raw = buildClickCheckoutUrl(click, {
      ...input,
      returnUrl: 'https://kidswear.uz/done?a=1&b=2',
    });
    expect(raw).not.toContain('done?a=1&b=2');
    expect(new URL(raw).searchParams.get('return_url')).toBe('https://kidswear.uz/done?a=1&b=2');
  });
});

describe('buildCheckoutUrl', () => {
  it('dispatches to the right provider', () => {
    expect(buildCheckoutUrl('payme', { payme }, input)).toContain('paycom.uz');
    expect(buildCheckoutUrl('click', { click }, input)).toContain('click.uz');
  });

  it('returns null for a provider that is not configured', () => {
    // The UI hides an unconfigured option instead of opening a broken page.
    expect(buildCheckoutUrl('payme', {}, input)).toBeNull();
    expect(buildCheckoutUrl('click', { payme }, input)).toBeNull();
  });

  it('returns null for the mock provider — it never leaves the app', () => {
    expect(buildCheckoutUrl('mock', { payme, click }, input)).toBeNull();
  });
});

describe('availableProviders', () => {
  it('lists only configured providers', () => {
    expect(availableProviders({ payme, click })).toEqual(['payme', 'click']);
    expect(availableProviders({ click })).toEqual(['click']);
    expect(availableProviders({})).toEqual([]);
  });
});
