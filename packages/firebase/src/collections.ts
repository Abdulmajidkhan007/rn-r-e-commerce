import {
  type CollectionReference,
  type DocumentReference,
  collection,
  doc,
} from 'firebase/firestore';
import {
  type Category,
  CategorySchema,
  type Order,
  OrderSchema,
  type Product,
  type ProductImage,
  ProductImageSchema,
  ProductSchema,
  type UserProfile,
  UserProfileSchema,
} from '@kidswear/core';
import { getDb } from './app';
import { createConverter } from './converters';

/** Firestore collection names. */
export const COLLECTIONS = {
  products: 'products',
  categories: 'categories',
  orders: 'orders',
  users: 'users',
  productImages: 'productImages',
  stockMoves: 'stockMoves',
  receipts: 'receipts',
  reviews: 'reviews',
} as const;

const productConverter = createConverter(ProductSchema);
const categoryConverter = createConverter(CategorySchema);
const orderConverter = createConverter(OrderSchema);
const userConverter = createConverter(UserProfileSchema, { idField: 'uid' });
const productImageConverter = createConverter(ProductImageSchema);

/**
 * Typed, converter-bound collection references. They are functions (not module
 * constants) because the Firestore instance only exists after `initFirebase`.
 */
export function productsCol(): CollectionReference<Product> {
  return collection(getDb(), COLLECTIONS.products).withConverter(productConverter);
}

export function categoriesCol(): CollectionReference<Category> {
  return collection(getDb(), COLLECTIONS.categories).withConverter(categoryConverter);
}

export function ordersCol(): CollectionReference<Order> {
  return collection(getDb(), COLLECTIONS.orders).withConverter(orderConverter);
}

export function usersCol(): CollectionReference<UserProfile> {
  return collection(getDb(), COLLECTIONS.users).withConverter(userConverter);
}

export function productImagesCol(): CollectionReference<ProductImage> {
  return collection(getDb(), COLLECTIONS.productImages).withConverter(productImageConverter);
}

export function productDoc(id: string): DocumentReference<Product> {
  return doc(productsCol(), id);
}

export function categoryDoc(id: string): DocumentReference<Category> {
  return doc(categoriesCol(), id);
}

export function orderDoc(id: string): DocumentReference<Order> {
  return doc(ordersCol(), id);
}

export function userDoc(uid: string): DocumentReference<UserProfile> {
  return doc(usersCol(), uid);
}
