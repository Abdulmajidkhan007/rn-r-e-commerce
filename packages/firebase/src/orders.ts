import {
  type Unsubscribe,
  type WithFieldValue,
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

/** Updates an order's status. Admin-only (enforced by rules). */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await updateDoc(orderDoc(id), { status, updatedAt: serverTimestamp() });
}
