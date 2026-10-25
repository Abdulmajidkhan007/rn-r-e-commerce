import type { Order, UserProfile } from '@kidswear/core';
import { SOLD_STATUSES } from './reports';

export interface CustomerRow {
  uid: string;
  displayName: string;
  /** '' for an order whose profile is missing. */
  email: string;
  phone?: string | undefined;
  isAdmin: boolean;
  /** Profile creation, epoch ms (absent for a missing profile). */
  createdAt?: number | undefined;
  /** Orders placed, cancelled ones excluded. */
  orders: number;
  /** Σ `total` of paid orders (same statuses as the sales report). */
  totalSpent: number;
  /** Creation time of the newest order of any status, or null. */
  lastOrderAt: number | null;
}

export type CustomerSort = 'spent' | 'orders' | 'lastOrder' | 'newest';

/**
 * Joins profiles with their orders in memory (Spark: no server counters). An
 * order whose profile is gone still gets a row, so no money goes missing.
 */
export function summarizeCustomers(
  users: readonly UserProfile[],
  orders: readonly Order[],
): CustomerRow[] {
  const rows = new Map<string, CustomerRow>();
  for (const u of users) {
    rows.set(u.uid, {
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone,
      isAdmin: u.role === 'admin',
      createdAt: u.createdAt,
      orders: 0,
      totalSpent: 0,
      lastOrderAt: null,
    });
  }
  for (const o of orders) {
    let row = rows.get(o.userId);
    if (!row) {
      row = {
        uid: o.userId,
        displayName: o.shippingAddress.fullName,
        email: '',
        phone: o.shippingAddress.phone,
        isAdmin: false,
        orders: 0,
        totalSpent: 0,
        lastOrderAt: null,
      };
      rows.set(o.userId, row);
    }
    if (row.lastOrderAt === null || o.createdAt > row.lastOrderAt) row.lastOrderAt = o.createdAt;
    if (o.status !== 'cancelled') row.orders++;
    if (SOLD_STATUSES.includes(o.status)) row.totalSpent += o.total;
  }
  return [...rows.values()];
}

/** Free-text filter (name, email, phone) and sort; ties fall back to name. */
export function filterCustomers(
  rows: readonly CustomerRow[],
  search: string,
  sort: CustomerSort,
): CustomerRow[] {
  const term = search.trim().toLowerCase();
  // Phones match only a phone-like term, so "u3@" does not match every "3".
  const digits = /^[\d\s+()-]+$/.test(term) ? term.replace(/\D/g, '') : '';
  const matched = term
    ? rows.filter(
        (r) =>
          r.displayName.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          (digits.length >= 3 && (r.phone ?? '').replace(/\D/g, '').includes(digits)),
      )
    : [...rows];
  const key = (r: CustomerRow): number => {
    switch (sort) {
      case 'spent':
        return r.totalSpent;
      case 'orders':
        return r.orders;
      case 'lastOrder':
        return r.lastOrderAt ?? -1;
      case 'newest':
        return r.createdAt ?? -1;
    }
  };
  return matched.sort((a, b) => key(b) - key(a) || a.displayName.localeCompare(b.displayName));
}

/** One page of `rows` (0-based `page`). */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  return rows.slice(page * pageSize, (page + 1) * pageSize);
}
