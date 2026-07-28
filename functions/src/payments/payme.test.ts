import { describe, expect, it } from 'vitest';
import { isAuthorized, orderIdFromAccount, PaymeError, PaymeState } from './payme.js';

const KEY = 'merchant-key-123';
const header = (user: string, password: string): string =>
  `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;

describe('isAuthorized', () => {
  it('accepts the documented Paycom user with the merchant key', () => {
    expect(isAuthorized(header('Paycom', KEY), KEY)).toBe(true);
  });

  it('rejects a wrong key', () => {
    expect(isAuthorized(header('Paycom', 'nope'), KEY)).toBe(false);
  });

  it('rejects a wrong username', () => {
    expect(isAuthorized(header('Attacker', KEY), KEY)).toBe(false);
  });

  it('rejects a missing or malformed header', () => {
    expect(isAuthorized(undefined, KEY)).toBe(false);
    expect(isAuthorized('', KEY)).toBe(false);
    expect(isAuthorized(`Bearer ${KEY}`, KEY)).toBe(false);
    expect(isAuthorized('Basic not-base64!!', KEY)).toBe(false);
  });

  it('rejects credentials with no colon separator', () => {
    const noColon = `Basic ${Buffer.from('Paycomkey', 'utf8').toString('base64')}`;
    expect(isAuthorized(noColon, KEY)).toBe(false);
  });

  it('keeps a colon inside the key intact', () => {
    // Splitting on the last colon instead of the first would corrupt such keys.
    const withColon = 'abc:def';
    expect(isAuthorized(header('Paycom', withColon), withColon)).toBe(true);
  });

  it('rejects an empty password against an empty key', () => {
    // An unset secret must not turn into "anyone may authenticate".
    expect(isAuthorized(header('Paycom', 'anything'), '')).toBe(false);
  });
});

describe('orderIdFromAccount', () => {
  it('reads the order id whatever the account field is called', () => {
    expect(orderIdFromAccount({ account: { order_id: 'order-abc' } })).toBe('order-abc');
    expect(orderIdFromAccount({ account: { buyurtma: 'order-abc' } })).toBe('order-abc');
  });

  it('returns empty when the account is missing or malformed', () => {
    expect(orderIdFromAccount(undefined)).toBe('');
    expect(orderIdFromAccount({})).toBe('');
    expect(orderIdFromAccount({ account: null })).toBe('');
    expect(orderIdFromAccount({ account: 'order-abc' })).toBe('');
  });

  it('ignores empty and non-string values', () => {
    expect(orderIdFromAccount({ account: { order_id: '' } })).toBe('');
    expect(orderIdFromAccount({ account: { order_id: 42 } })).toBe('');
    expect(orderIdFromAccount({ account: { blank: '', order_id: 'order-abc' } })).toBe('order-abc');
  });
});

describe('protocol constants', () => {
  it('uses Payme’s documented error codes', () => {
    // These are wire values — a typo here silently breaks the integration.
    expect(PaymeError.InvalidAmount).toBe(-31001);
    expect(PaymeError.TransactionNotFound).toBe(-31003);
    expect(PaymeError.CantPerform).toBe(-31008);
    expect(PaymeError.InvalidAccount).toBe(-31050);
    expect(PaymeError.MethodNotFound).toBe(-32601);
  });

  it('uses Payme’s documented transaction states', () => {
    expect(PaymeState.Created).toBe(1);
    expect(PaymeState.Completed).toBe(2);
    expect(PaymeState.CancelledBeforePerform).toBe(-1);
    expect(PaymeState.CancelledAfterPerform).toBe(-2);
  });
});
