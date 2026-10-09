/**
 * Store content outside the catalog: contact messages, blog, promo codes,
 * delivery settings and favorites. Authorization lives in firestore.rules;
 * these functions only shape the reads and writes.
 */
import {
  type WithFieldValue,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  type BlogPost,
  BlogPostSchema,
  type ContactMessage,
  ContactMessageSchema,
  type ContactStatus,
  type DeliverySettings,
  DeliverySettingsSchema,
  type PromoCode,
  PromoCodeSchema,
} from '@kidswear/core';
import { getDb } from './app';
import { createConverter } from './converters';

export const CONTENT_COLLECTIONS = {
  messages: 'messages',
  blog: 'blogPosts',
  promoCodes: 'promoCodes',
  settings: 'settings',
  favorites: 'favorites',
} as const;

const messageConverter = createConverter(ContactMessageSchema);
const blogConverter = createConverter(BlogPostSchema);
const promoConverter = createConverter(PromoCodeSchema);

const messagesCol = () =>
  collection(getDb(), CONTENT_COLLECTIONS.messages).withConverter(messageConverter);
const blogCol = () => collection(getDb(), CONTENT_COLLECTIONS.blog).withConverter(blogConverter);
const promoCol = () =>
  collection(getDb(), CONTENT_COLLECTIONS.promoCodes).withConverter(promoConverter);
const deliveryDoc = () => doc(getDb(), CONTENT_COLLECTIONS.settings, 'delivery');
const favoritesCol = (uid: string) =>
  collection(getDb(), 'users', uid, CONTENT_COLLECTIONS.favorites);

// --- Contact messages -------------------------------------------------------

export type ContactMessageInput = Pick<ContactMessage, 'name' | 'phone' | 'message'> & {
  email?: string;
  userId?: string;
};

export async function sendContactMessage(input: ContactMessageInput): Promise<void> {
  const ref = doc(messagesCol());
  const value: WithFieldValue<ContactMessage> = {
    id: ref.id,
    name: input.name,
    phone: input.phone,
    message: input.message,
    status: 'new',
    ...(input.email ? { email: input.email } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, value);
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const snap = await getDocs(query(messagesCol(), orderBy('createdAt', 'desc'), limit(200)));
  return snap.docs.map((d) => d.data());
}

export async function setContactMessageStatus(id: string, status: ContactStatus): Promise<void> {
  await updateDoc(doc(messagesCol(), id), { status, updatedAt: serverTimestamp() });
}

export async function deleteContactMessage(id: string): Promise<void> {
  await deleteDoc(doc(messagesCol(), id));
}

// --- Blog -------------------------------------------------------------------

export type BlogPostInput = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;

/** Published posts, newest first (needs the published+publishedAt index). */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const snap = await getDocs(
    query(blogCol(), where('published', '==', true), orderBy('publishedAt', 'desc'), limit(50)),
  );
  return snap.docs.map((d) => d.data());
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await getDocs(
    query(blogCol(), where('published', '==', true), where('slug', '==', slug), limit(1)),
  );
  return snap.docs[0]?.data() ?? null;
}

/** Admin: every post, drafts included. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const snap = await getDocs(query(blogCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data());
}

export async function saveBlogPost(id: string | null, input: BlogPostInput): Promise<string> {
  // publishedAt is stamped the first time a post goes live and then kept, so
  // editing an old post does not bump it to the top of the blog.
  const withDate: BlogPostInput =
    input.published && input.publishedAt === undefined
      ? { ...input, publishedAt: Date.now() }
      : input;
  if (id) {
    const { publishedAt, coverImage, ...rest } = withDate;
    await updateDoc(doc(blogCol(), id), {
      ...rest,
      ...(publishedAt !== undefined ? { publishedAt } : {}),
      // Clearing the field in the form must remove it, not keep the old image.
      coverImage: coverImage ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
    return id;
  }
  const ref = doc(blogCol());
  await setDoc(ref, {
    ...withDate,
    id: ref.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as WithFieldValue<BlogPost>);
  return ref.id;
}

export async function deleteBlogPost(id: string): Promise<void> {
  await deleteDoc(doc(blogCol(), id));
}

// --- Promo codes ------------------------------------------------------------

export type PromoCodeInput = Omit<PromoCode, 'createdAt' | 'updatedAt'>;

/** Exact lookup by code — the only promo read a customer is allowed. */
export async function getPromoCode(code: string): Promise<PromoCode | null> {
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return null;
  const snap = await getDoc(doc(promoCol(), code));
  return snap.exists() ? snap.data() : null;
}

/** Admin: all codes. */
export async function getPromoCodes(): Promise<PromoCode[]> {
  const snap = await getDocs(query(promoCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data());
}

export async function savePromoCode(input: PromoCodeInput, isNew: boolean): Promise<void> {
  const ref = doc(promoCol(), input.id);
  if (isNew) {
    await setDoc(ref, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as WithFieldValue<PromoCode>);
    return;
  }
  const { id: _id, expiresAt, ...rest } = input;
  await updateDoc(ref, {
    ...rest,
    expiresAt: expiresAt ?? deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePromoCode(code: string): Promise<void> {
  await deleteDoc(doc(promoCol(), code));
}

// --- Delivery settings --------------------------------------------------------

/** null when the admin has not configured delivery yet (delivery is then free). */
export async function getDeliverySettings(): Promise<DeliverySettings | null> {
  const snap = await getDoc(deliveryDoc());
  if (!snap.exists()) return null;
  const parsed = DeliverySettingsSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

export async function saveDeliverySettings(settings: DeliverySettings): Promise<void> {
  await setDoc(deliveryDoc(), DeliverySettingsSchema.parse(settings));
}

// --- Favorites ----------------------------------------------------------------

/** Live set of product ids the user has saved. */
export function subscribeFavorites(uid: string, cb: (ids: string[]) => void): Unsubscribe {
  return onSnapshot(query(favoritesCol(uid), orderBy('createdAt', 'desc')), (snap) => {
    cb(snap.docs.map((d) => d.id));
  });
}

export async function setFavorite(uid: string, productId: string, on: boolean): Promise<void> {
  const ref = doc(favoritesCol(uid), productId);
  if (on) await setDoc(ref, { productId, createdAt: serverTimestamp() });
  else await deleteDoc(ref);
}
