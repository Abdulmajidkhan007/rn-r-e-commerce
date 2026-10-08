import { describe, expect, it } from 'vitest';
import { OrderSchema, OrderStatusSchema } from './order';
import { ProductSchema } from './product';
import { PushTokensSchema, UserProfileSchema } from './user';
import { LocalizedTextSchema } from './localized';

const address = {
  id: 'a1',
  fullName: 'Ali Valiyev',
  phone: '+998901234567',
  region: 'Toshkent',
  district: 'Chilonzor',
  street: 'Bunyodkor 12',
};

const validProduct = {
  id: 'p1',
  name: { uz: 'Koʻylak' },
  description: { uz: 'Tavsif' },
  price: 150_000,
  categoryId: 'c1',
  images: [],
  sizes: [],
  colors: [],
  stock: 10,
  rating: 4.5,
  reviewCount: 2,
  isActive: true,
  createdAt: 1_767_225_600_000,
  updatedAt: 1_767_225_600_000,
};

const validOrder = {
  id: 'o1',
  userId: 'u1',
  items: [],
  subtotal: 100_000,
  depositAmount: 50_000,
  paidAmount: 50_000,
  total: 100_000,
  status: 'deposit_paid',
  shippingAddress: address,
  createdAt: 1_767_225_600_000,
  updatedAt: 1_767_225_600_000,
};

describe('LocalizedTextSchema', () => {
  it('requires uz and allows en/ru to be absent', () => {
    expect(LocalizedTextSchema.safeParse({ uz: 'X' }).success).toBe(true);
    expect(LocalizedTextSchema.safeParse({ en: 'X' }).success).toBe(false);
  });
});

describe('ProductSchema', () => {
  it('accepts a well-formed product', () => {
    expect(ProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it('rejects a fractional price — UZS is integer som', () => {
    expect(ProductSchema.safeParse({ ...validProduct, price: 150_000.5 }).success).toBe(false);
  });

  it('rejects negative price and stock', () => {
    expect(ProductSchema.safeParse({ ...validProduct, price: -1 }).success).toBe(false);
    expect(ProductSchema.safeParse({ ...validProduct, stock: -1 }).success).toBe(false);
  });

  it('constrains rating to the 0..5 range the UI renders', () => {
    expect(ProductSchema.safeParse({ ...validProduct, rating: 5 }).success).toBe(true);
    expect(ProductSchema.safeParse({ ...validProduct, rating: 5.1 }).success).toBe(false);
    expect(ProductSchema.safeParse({ ...validProduct, rating: -0.1 }).success).toBe(false);
  });

  it('rejects a Date for a timestamp — they cross the wire as epoch millis', () => {
    // redux-persist must be able to serialize these; a Date would break it.
    expect(ProductSchema.safeParse({ ...validProduct, createdAt: new Date() }).success).toBe(false);
  });
});

describe('OrderStatusSchema', () => {
  it('accepts exactly the six known statuses', () => {
    expect(OrderStatusSchema.options).toHaveLength(6);
    for (const s of OrderStatusSchema.options) {
      expect(OrderStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it('rejects an unknown status', () => {
    expect(OrderStatusSchema.safeParse('refunded').success).toBe(false);
  });
});

describe('OrderSchema', () => {
  it('accepts a well-formed order', () => {
    expect(OrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it('rejects fractional or negative money', () => {
    expect(OrderSchema.safeParse({ ...validOrder, paidAmount: 50_000.5 }).success).toBe(false);
    expect(OrderSchema.safeParse({ ...validOrder, total: -1 }).success).toBe(false);
  });

  it('requires a shipping address', () => {
    const { shippingAddress: _omitted, ...withoutAddress } = validOrder;
    expect(OrderSchema.safeParse(withoutAddress).success).toBe(false);
  });
});

describe('PushTokensSchema', () => {
  it('defaults fcm to an empty array', () => {
    const parsed = PushTokensSchema.parse({});
    expect(parsed.fcm).toEqual([]);
  });

  it('ignores a legacy expo array left by pre-migration clients', () => {
    // The Expo channel is gone; stale keys must not fail the profile read.
    const parsed = PushTokensSchema.parse({ expo: ['ExponentPushToken[x]'], fcm: ['fcm-1'] });
    expect(parsed.fcm).toEqual(['fcm-1']);
    expect(parsed).not.toHaveProperty('expo');
  });
});

describe('UserProfileSchema', () => {
  const profile = {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Ali',
    role: 'customer',
    addresses: [address],
    createdAt: 1_767_225_600_000,
  };

  it('accepts a minimal customer profile', () => {
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(UserProfileSchema.safeParse({ ...profile, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(UserProfileSchema.safeParse({ ...profile, role: 'superadmin' }).success).toBe(false);
  });
});
