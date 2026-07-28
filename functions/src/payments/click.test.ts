import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  amountMatches,
  buildSignString,
  ClickAction,
  verifySignature,
  type ClickRequest,
} from './click.js';

const SECRET = 'super-secret-key';

const prepare: ClickRequest = {
  click_trans_id: '1001',
  service_id: 'S1',
  merchant_trans_id: 'order-abc',
  amount: '150000.00',
  action: '0',
  sign_time: '2026-07-28 12:00:00',
};

const complete: ClickRequest = {
  ...prepare,
  action: '1',
  merchant_prepare_id: 'order-abc',
};

function sign(req: ClickRequest): string {
  return createHash('md5').update(buildSignString(req, SECRET)).digest('hex');
}

describe('buildSignString', () => {
  it('omits merchant_prepare_id on Prepare', () => {
    expect(buildSignString(prepare, SECRET)).toBe(
      `1001S1${SECRET}order-abc150000.0002026-07-28 12:00:00`,
    );
  });

  it('includes merchant_prepare_id on Complete', () => {
    // The extra slot is exactly what makes the two actions sign differently;
    // getting this wrong rejects every Complete callback.
    expect(buildSignString(complete, SECRET)).toBe(
      `1001S1${SECRET}order-abcorder-abc150000.0012026-07-28 12:00:00`,
    );
  });

  it('produces different strings for the two actions', () => {
    expect(buildSignString(prepare, SECRET)).not.toBe(buildSignString(complete, SECRET));
  });

  it('treats missing fields as empty rather than "undefined"', () => {
    expect(buildSignString({ action: String(ClickAction.Prepare) }, SECRET)).not.toContain(
      'undefined',
    );
  });
});

describe('verifySignature', () => {
  it('accepts a correctly signed Prepare', () => {
    expect(verifySignature({ ...prepare, sign_string: sign(prepare) }, SECRET)).toBe(true);
  });

  it('accepts a correctly signed Complete', () => {
    expect(verifySignature({ ...complete, sign_string: sign(complete) }, SECRET)).toBe(true);
  });

  it('accepts an uppercase signature', () => {
    const upper = sign(prepare).toUpperCase();
    expect(verifySignature({ ...prepare, sign_string: upper }, SECRET)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    const forged = createHash('md5').update(buildSignString(prepare, 'wrong')).digest('hex');
    expect(verifySignature({ ...prepare, sign_string: forged }, SECRET)).toBe(false);
  });

  it('rejects a tampered amount', () => {
    // The attack this actually blocks: replaying a valid callback with a
    // smaller amount to mark a large order paid.
    const signed = { ...prepare, sign_string: sign(prepare) };
    expect(verifySignature({ ...signed, amount: '1.00' }, SECRET)).toBe(false);
  });

  it('rejects a tampered order id', () => {
    const signed = { ...prepare, sign_string: sign(prepare) };
    expect(verifySignature({ ...signed, merchant_trans_id: 'order-other' }, SECRET)).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(verifySignature(prepare, SECRET)).toBe(false);
  });

  it('rejects a Prepare signature replayed as Complete', () => {
    const signed = { ...prepare, sign_string: sign(prepare) };
    expect(verifySignature({ ...signed, action: '1' }, SECRET)).toBe(false);
  });
});

describe('amountMatches', () => {
  it('accepts the deposit with trailing decimals', () => {
    expect(amountMatches('150000.00', 150_000)).toBe(true);
    expect(amountMatches('150000', 150_000)).toBe(true);
  });

  it('rejects a different amount', () => {
    expect(amountMatches('149999.00', 150_000)).toBe(false);
    expect(amountMatches('1500000', 150_000)).toBe(false);
  });

  it('rejects unparseable input rather than coercing it to zero', () => {
    expect(amountMatches(undefined, 150_000)).toBe(false);
    expect(amountMatches('', 150_000)).toBe(false);
    expect(amountMatches('abc', 150_000)).toBe(false);
  });

  it('does not treat an empty amount as a zero-som order', () => {
    expect(amountMatches('', 0)).toBe(false);
  });
});
