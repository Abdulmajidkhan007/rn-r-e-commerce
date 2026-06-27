import {
  type QueryConstraint,
  type Unsubscribe,
  type WithFieldValue,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  doc,
} from 'firebase/firestore';
import type { Order, OrderStatus } from '@kidswear/core';
import { orderDoc, ordersCol } from './collections';
import type { OrderInput } from './types';

/** Creates an order with a generated id and server-stamped timestamps; returns the new id. */
export async function createOrder(input: OrderInput): Promise<string> {
  const ref = doc(ordersCol());
  const value: WithFieldValue<Order> = {
    ...input,
    id: ref.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, value);
  return ref.id;
}

/** One-shot fetch of a user's orders, newest first. */
export async function getOrdersByUser(uid: string): Promise<Order[]> {
  const snap = await getDocs(
    query(ordersCol(), where('userId', '==', uid), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => d.data());
}

/** Real-time subscription to a user's orders, newest first. */
export function subscribeOrdersByUser(uid: string, cb: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(
    query(ordersCol(), where('userId', '==', uid), orderBy('createdAt', 'desc')),
    (snap) => {
      cb(snap.docs.map((d) => d.data()));
    },
  );
}

/** One-shot fetch of every order, newest first. Admin-only (enforced by rules). */
export async function getAllOrders(): Promise<Order[]> {
  const snap = await getDocs(query(ordersCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data());
}

/** Real-time subscription to all orders (admin), optionally filtered by status. */
export function subscribeAllOrders(
  cb: (orders: Order[]) => void,
  statusFilter?: OrderStatus,
): Unsubscribe {
  const constraints: QueryConstraint[] = statusFilter
    ? [where('status', '==', statusFilter), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')];
  return onSnapshot(query(ordersCol(), ...constraints), (snap) => {
    cb(snap.docs.map((d) => d.data()));
  });
}

/** One-shot fetch of a single order by id, or `null`. Owner/admin (per rules). */
export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(orderDoc(id));
  return snap.exists() ? snap.data() : null;
}

/** Real-time subscription to a single order. Owner/admin (per rules). */
export function subscribeOrder(id: string, cb: (order: Order | null) => void): Unsubscribe {
  return onSnapshot(orderDoc(id), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

/**
 * Updates an order's status. Admin status changes are admin-only; an owner may
 * only cancel a pending/deposit_paid order — both enforced by Firestore rules.
 */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await updateDoc(orderDoc(id), { status, updatedAt: serverTimestamp() });
}
