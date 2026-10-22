import { describe, expect, it } from 'vitest';
import {
  MAX_RECEIPTS_PER_ORDER,
  PaymentSettingsSchema,
  formatCardNumber,
  isTransferAvailable,
  nextReceiptSlot,
  normalizeCardNumber,
  pendingReceiptCounts,
  receiptId,
  receiptUploadBlock,
  sortReceipts,
  type PaymentSettings,
} from './transfer';
import { PaymentProviderSchema } from './payment';

const settings: PaymentSettings = {
  transferEnabled: true,
  cardNumber: '8600000000000000',
  cardHolder: 'KIDSWEAR TEST',
  bank: 'Test bank',
  note: '',
};

describe('card number helpers', () => {
  it('normalizes pasted input to digits', () => {
    expect(normalizeCardNumber(' 8600-0000 0000 0000 ')).toBe('8600000000000000');
  });

  it('formats in groups of four', () => {
    expect(formatCardNumber('8600000000000000')).toBe('8600 0000 0000 0000');
    expect(formatCardNumber('860000')).toBe('8600 00');
    expect(formatCardNumber('')).toBe('');
  });
});

describe('PaymentSettingsSchema', () => {
  it('accepts a complete enabled card', () => {
    expect(PaymentSettingsSchema.safeParse(settings).success).toBe(true);
  });

  it('rejects an enabled transfer without a valid card or holder', () => {
    expect(PaymentSettingsSchema.safeParse({ ...settings, cardNumber: '' }).success).toBe(false);
    expect(PaymentSettingsSchema.safeParse({ ...settings, cardNumber: '8600 0000' }).success).toBe(
      false,
    );
    expect(PaymentSettingsSchema.safeParse({ ...settings, cardHolder: '' }).success).toBe(false);
  });

  it('allows empty card fields while switched off', () => {
    const off = { ...settings, transferEnabled: false, cardNumber: '', cardHolder: '' };
    expect(PaymentSettingsSchema.safeParse(off).success).toBe(true);
    expect(isTransferAvailable(off)).toBe(false);
  });

  it('isTransferAvailable needs settings, the switch and a card', () => {
    expect(isTransferAvailable(settings)).toBe(true);
    expect(isTransferAvailable(null)).toBe(false);
    expect(isTransferAvailable({ ...settings, transferEnabled: false })).toBe(false);
  });

  it('transfer is a payment provider', () => {
    expect(PaymentProviderSchema.safeParse('transfer').success).toBe(true);
  });
});

describe('receipt slots', () => {
  it('fills the first free slot and stops at the cap', () => {
    expect(nextReceiptSlot('o1', [])).toBe(1);
    expect(nextReceiptSlot('o1', [{ id: receiptId('o1', 1) }, { id: receiptId('o1', 3) }])).toBe(2);
    const full = Array.from({ length: MAX_RECEIPTS_PER_ORDER }, (_, i) => ({
      id: receiptId('o1', i + 1),
    }));
    expect(nextReceiptSlot('o1', full)).toBeNull();
  });

  it('ids are per order', () => {
    expect(receiptId('abc', 2)).toBe('abc_r2');
    expect(nextReceiptSlot('o2', [{ id: receiptId('o1', 1) }])).toBe(1);
  });
});

describe('receiptUploadBlock', () => {
  const transfer = {
    status: 'pending' as const,
    payment: { provider: 'transfer' as const, state: 'created' as const },
  };

  it('allows a pending transfer order under the cap', () => {
    expect(receiptUploadBlock(transfer, [{ status: 'rejected' }])).toBeNull();
  });

  it('blocks other providers, non-pending orders, approved and full orders', () => {
    expect(
      receiptUploadBlock({ ...transfer, payment: { provider: 'mock', state: 'paid' } }, []),
    ).toBe('notTransfer');
    expect(receiptUploadBlock({ status: 'pending' }, [])).toBe('notTransfer');
    expect(receiptUploadBlock({ ...transfer, status: 'deposit_paid' }, [])).toBe('notPending');
    expect(receiptUploadBlock(transfer, [{ status: 'approved' }])).toBe('approved');
    expect(
      receiptUploadBlock(
        transfer,
        Array.from({ length: MAX_RECEIPTS_PER_ORDER }, () => ({ status: 'rejected' as const })),
      ),
    ).toBe('limit');
  });
});

describe('receipt lists', () => {
  it('sorts newest first without mutating', () => {
    const input = [{ createdAt: 1 }, { createdAt: 3 }, { createdAt: 2 }];
    expect(sortReceipts(input).map((r) => r.createdAt)).toEqual([3, 2, 1]);
    expect(input[0]?.createdAt).toBe(1);
  });

  it('counts pending receipts per order', () => {
    const counts = pendingReceiptCounts([
      { orderId: 'a', status: 'pending' },
      { orderId: 'a', status: 'pending' },
      { orderId: 'a', status: 'rejected' },
      { orderId: 'b', status: 'approved' },
    ]);
    expect(counts.get('a')).toBe(2);
    expect(counts.has('b')).toBe(false);
  });
});
