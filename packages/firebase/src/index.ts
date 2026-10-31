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
  productImagesCol,
  productDoc,
  categoryDoc,
  orderDoc,
  userDoc,
} from './collections';

export type { ProductInput, CategoryInput, OrderInput, UserProfileInput } from './types';

export {
  countActiveProducts,
  getProducts,
  getProductPage,
  subscribeProducts,
  getProductById,
  subscribeProduct,
} from './products';
export type { ProductFilters, ProductPage, ProductSortField } from './products';

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
  InventoryError,
  changeOrderStatus,
  adjustStock,
  getStockMoves,
  cancelOwnOrder,
} from './inventory';
export type { InventoryErrorCode, StatusChangeResult, StockAdjustment } from './inventory';

export {
  newProductId,
  newCategoryId,
  createProduct,
  updateProduct,
  deleteProduct,
  trashProduct,
  restoreProduct,
  bulkUpdateProducts,
  hideProductsWithoutImages,
  recomputeSearchTokens,
  purgeExpiredProducts,
  importProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from './admin';
export type { BulkProductAction, ImportProductsResult } from './admin';

export {
  getUserProfile,
  upsertUserProfile,
  setUserAvatar,
  addPushToken,
  removePushToken,
  setUserLanguage,
  subscribeUserProfile,
  getAllUsers,
} from './users';

export {
  getProductCosts,
  getProductCost,
  setProductCost,
  getOrderCosts,
  backfillOrderCost,
} from './costs';

export {
  CONTENT_COLLECTIONS,
  sendContactMessage,
  getContactMessages,
  setContactMessageStatus,
  deleteContactMessage,
  getPublishedPosts,
  getPublishedPostBySlug,
  getAllPosts,
  saveBlogPost,
  deleteBlogPost,
  getFaqs,
  saveFaq,
  deleteFaq,
  getPromoCode,
  getPromoCodes,
  savePromoCode,
  deletePromoCode,
  getDeliverySettings,
  saveDeliverySettings,
  getPaymentSettings,
  savePaymentSettings,
  subscribeFavorites,
  setFavorite,
} from './content';
export type { ContactMessageInput, BlogPostInput, PromoCodeInput, FaqInput } from './content';

export {
  storagePaths,
  uploadProductImage,
  uploadAvatar,
  getDownloadUrl,
  deleteStorageObject,
} from './storage';
export type { UploadData } from './storage';

export {
  ReceiptError,
  uploadReceipt,
  subscribeOrderReceipts,
  subscribePendingReceipts,
  reviewReceipt,
} from './receipts';
export type { ReceiptErrorCode, ReceiptReview } from './receipts';

export {
  ReviewError,
  submitReview,
  editOwnReview,
  subscribeOrderReviews,
  getProductReviewsPage,
  getFeaturedReviews,
  getAdminReviews,
  moderateReview,
  recomputeAllRatings,
} from './reviews';
export type { ReviewErrorCode, SubmitReviewInput, ReviewPage, ReviewModeration } from './reviews';

export { PRODUCT_IMAGE_BACKEND, saveProductImage, getInlineImage } from './productImages';
export type { ProductImageBackend, EncodedImage } from './productImages';

export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogleCredential,
  signOutUser,
  sendPasswordReset,
  onAuthChange,
  getCurrentClaims,
} from './auth';
export type { AuthClaims, User, AuthCredential } from './auth';

// Commonly needed Firebase types re-exported for app bootstrap / consumers.
export type { FirebaseOptions } from 'firebase/app';
export type { Persistence } from 'firebase/auth';
export type { Unsubscribe } from 'firebase/firestore';
