/**
 * @kidswear/firebase — shared, platform-agnostic Firebase data layer.
 *
 * Stays platform-agnostic: it never imports AsyncStorage or react-native and
 * never reads env. Each app injects its config + auth persistence via
 * `initFirebase`. Types come from @kidswear/core (never redefined here).
 */
export { initFirebase, getFirebase, getDb } from './app';
export type { FirebaseServices, InitFirebaseOptions } from './app';

export { createConverter } from './converters';
export type { ConverterOptions } from './converters';

export {
  COLLECTIONS,
  productsCol,
  categoriesCol,
  ordersCol,
  usersCol,
  productDoc,
  categoryDoc,
  orderDoc,
  userDoc,
} from './collections';

export type { ProductInput, CategoryInput, OrderInput, UserProfileInput } from './types';

export { getProducts, subscribeProducts, getProductById, subscribeProduct } from './products';
export type { ProductFilters } from './products';

export { getCategories, subscribeCategories } from './categories';

export {
  createOrder,
  getOrdersByUser,
  subscribeOrdersByUser,
  getOrderById,
  subscribeOrder,
  getAllOrders,
  subscribeAllOrders,
  updateOrderStatus,
} from './orders';

export {
  newProductId,
  newCategoryId,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
} from './admin';

export {
  getUserProfile,
  upsertUserProfile,
  setUserAvatar,
  addPushToken,
  removePushToken,
  setUserLanguage,
  subscribeUserProfile,
} from './users';

export {
  storagePaths,
  uploadProductImage,
  uploadAvatar,
  getDownloadUrl,
  deleteStorageObject,
} from './storage';
export type { UploadData } from './storage';

export {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  sendPasswordReset,
  onAuthChange,
  getCurrentClaims,
} from './auth';
export type { AuthClaims, User } from './auth';

// Commonly needed Firebase types re-exported for app bootstrap / consumers.
export type { FirebaseOptions } from 'firebase/app';
export type { Persistence } from 'firebase/auth';
export type { Unsubscribe } from 'firebase/firestore';
