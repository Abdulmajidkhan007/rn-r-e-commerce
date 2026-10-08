import type { Address, Order, OrderStatus, Product } from '@kidswear/core';

/**
 * Fully-typed fixture builders for tests. No `as` casts: an incomplete fixture
 * should fail to compile rather than silently drift from the real schema.
 */

const TS = 1_767_225_600_000; // 2026-01-01T00:00:00Z, epoch millis

export const testAddress: Address = {
  id: 'addr-1',
  fullName: 'Ali Valiyev',
  phone: '+998901234567',
  region: 'Toshkent',
  district: 'Chilonzor',
  street: 'Bunyodkor 12',
};

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: { uz: 'Koʻylak' },
    description: { uz: 'Tavsif' },
    price: 100_000,
    categoryId: 'c1',
    images: [],
    sizes: [],
    colors: [],
    stock: 10,
    rating: 0,
    reviewCount: 0,
    isActive: true,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  const status: OrderStatus = 'deposit_paid';
  return {
    id: 'o1',
    userId: 'u1',
    items: [],
    subtotal: 100_000,
    depositAmount: 50_000,
    paidAmount: 50_000,
    total: 100_000,
    status,
    shippingAddress: testAddress,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}
