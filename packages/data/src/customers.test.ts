import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@kidswear/core';
import { filterCustomers, pageOf, summarizeCustomers } from './customers';
import { makeOrder } from './testFixtures';

const user = (uid: string, displayName: string, over: Partial<UserProfile> = {}): UserProfile => ({
  uid,
  email: `${uid}@example.com`,
  displayName,
  role: 'customer',
  addresses: [],
  createdAt: 1000,
  ...over,
});

describe('summarizeCustomers', () => {
  const users = [
    user('u1', 'Ali', { phone: '+998 93 765-43-21' }),
    user('u2', 'Vali', { createdAt: 2000 }),
    user('u3', 'Admin', { role: 'admin' }),
  ];
  const orders = [
    makeOrder({ id: 'a', userId: 'u1', status: 'delivered', total: 300_000, createdAt: 10 }),
    makeOrder({ id: 'b', userId: 'u1', status: 'pending', total: 50_000, createdAt: 30 }),
    makeOrder({ id: 'c', userId: 'u1', status: 'cancelled', total: 80_000, createdAt: 40 }),
    makeOrder({ id: 'd', userId: 'u2', status: 'deposit_paid', total: 100_000, createdAt: 20 }),
    makeOrder({ id: 'e', userId: 'ghost', status: 'processing', total: 70_000, createdAt: 5 }),
  ];
  const rows = summarizeCustomers(users, orders);
  const byId = new Map(rows.map((r) => [r.uid, r]));

  it('counts orders without cancelled, spend over paid orders only', () => {
    expect(byId.get('u1')).toMatchObject({ orders: 2, totalSpent: 300_000, lastOrderAt: 40 });
    expect(byId.get('u2')).toMatchObject({ orders: 1, totalSpent: 100_000, lastOrderAt: 20 });
    expect(byId.get('u3')).toMatchObject({
      orders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      isAdmin: true,
    });
  });

  it('keeps orders whose profile is missing', () => {
    expect(byId.get('ghost')).toMatchObject({ email: '', orders: 1, totalSpent: 70_000 });
  });

  it('sorts and filters by name, email or phone digits', () => {
    expect(filterCustomers(rows, '', 'spent').map((r) => r.uid)).toEqual([
      'u1',
      'u2',
      'ghost',
      'u3',
    ]);
    expect(filterCustomers(rows, '', 'lastOrder')[0]?.uid).toBe('u1');
    expect(filterCustomers(rows, '', 'newest')[0]?.uid).toBe('u2');
    // The profile-less row is named after its shipping address ("Ali Valiyev").
    expect(filterCustomers(rows, 'VAL', 'spent').map((r) => r.uid)).toEqual(['u2', 'ghost']);
    expect(filterCustomers(rows, 'u3@', 'spent').map((r) => r.uid)).toEqual(['u3']);
    expect(filterCustomers(rows, '765 43', 'spent').map((r) => r.uid)).toEqual(['u1']);
  });
});

describe('pageOf', () => {
  it('slices 0-based pages', () => {
    const items = Array.from({ length: 7 }, (_, i) => i);
    expect(pageOf(items, 0, 3)).toEqual([0, 1, 2]);
    expect(pageOf(items, 2, 3)).toEqual([6]);
    expect(pageOf(items, 3, 3)).toEqual([]);
  });
});
