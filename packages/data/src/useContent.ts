import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  deliveryText,
  normalizePromoCode,
  type DeliveryText,
  type BlogPost,
  type ContactMessage,
  type ContactStatus,
  type DeliverySettings,
  type Faq,
  type PaymentSettings,
  type PromoCode,
} from '@kidswear/core';
import {
  deleteBlogPost,
  deleteContactMessage,
  deleteFaq,
  deletePromoCode,
  getAllPosts,
  getContactMessages,
  getDeliverySettings,
  getFaqs,
  getPaymentSettings,
  getPromoCode,
  getPromoCodes,
  getPublishedPostBySlug,
  getPublishedPosts,
  saveBlogPost,
  saveDeliverySettings,
  saveFaq,
  savePaymentSettings,
  savePromoCode,
  sendContactMessage,
  setContactMessageStatus,
  setFavorite,
  subscribeFavorites,
  type BlogPostInput,
  type ContactMessageInput,
  type FaqInput,
  type PromoCodeInput,
} from '@kidswear/firebase';
import { formatPrice } from '@kidswear/utils';

export const contentKeys = {
  messages: ['messages'] as const,
  blog: ['blog'] as const,
  blogAdmin: ['blog', 'admin'] as const,
  faqs: ['faqs'] as const,
  blogPost: (slug: string) => ['blog', 'post', slug] as const,
  promos: ['promos'] as const,
  delivery: ['settings', 'delivery'] as const,
  payment: ['settings', 'payment'] as const,
};

// --- Contact ----------------------------------------------------------------

export function useSendContactMessage(): UseMutationResult<void, Error, ContactMessageInput> {
  return useMutation({ mutationFn: sendContactMessage });
}

export function useContactMessages(): UseQueryResult<ContactMessage[]> {
  return useQuery({ queryKey: contentKeys.messages, queryFn: getContactMessages });
}

export function useSetMessageStatus(): UseMutationResult<
  void,
  Error,
  { id: string; status: ContactStatus }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => setContactMessageStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.messages }),
  });
}

export function useDeleteMessage(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContactMessage,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.messages }),
  });
}

// --- Blog -------------------------------------------------------------------

export function usePublishedPosts(): UseQueryResult<BlogPost[]> {
  return useQuery({ queryKey: contentKeys.blog, queryFn: getPublishedPosts });
}

export function useBlogPost(slug: string | undefined): UseQueryResult<BlogPost | null> {
  return useQuery({
    queryKey: contentKeys.blogPost(slug ?? ''),
    queryFn: () => getPublishedPostBySlug(slug ?? ''),
    enabled: !!slug,
  });
}

export function useAdminPosts(): UseQueryResult<BlogPost[]> {
  return useQuery({ queryKey: contentKeys.blogAdmin, queryFn: getAllPosts });
}

export function useSaveBlogPost(): UseMutationResult<
  string,
  Error,
  { id: string | null; input: BlogPostInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => saveBlogPost(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.blog }),
  });
}

export function useDeleteBlogPost(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.blog }),
  });
}

// --- FAQ --------------------------------------------------------------------

export function useFaqs(): UseQueryResult<Faq[]> {
  return useQuery({ queryKey: contentKeys.faqs, queryFn: getFaqs });
}

export function useSaveFaq(): UseMutationResult<
  string,
  Error,
  { id: string | null; input: FaqInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => saveFaq(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.faqs }),
  });
}

export function useDeleteFaq(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.faqs }),
  });
}

// --- Promo codes ------------------------------------------------------------

/** Checkout: look up a typed code (exact id). null = no such code. */
export function useLookupPromo(): UseMutationResult<PromoCode | null, Error, string> {
  return useMutation({ mutationFn: (code: string) => getPromoCode(normalizePromoCode(code)) });
}

export function usePromoCodes(): UseQueryResult<PromoCode[]> {
  return useQuery({ queryKey: contentKeys.promos, queryFn: getPromoCodes });
}

export function useSavePromoCode(): UseMutationResult<
  void,
  Error,
  { input: PromoCodeInput; isNew: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, isNew }) => savePromoCode(input, isNew),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.promos }),
  });
}

export function useDeletePromoCode(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePromoCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.promos }),
  });
}

// --- Delivery ---------------------------------------------------------------

export function useDeliverySettings(): UseQueryResult<DeliverySettings | null> {
  return useQuery({ queryKey: contentKeys.delivery, queryFn: getDeliverySettings });
}

/**
 * Delivery wording for the active language — the one place every screen gets
 * its delivery sentences from. Pass the basket amount (after discount) for the
 * cart/checkout state; omit it for the plain policy (footer, delivery page).
 */
export function useDeliveryText(
  language: 'uz' | 'en' | 'ru',
  amountAfterDiscount?: number,
): DeliveryText {
  const { data } = useDeliverySettings();
  return deliveryText(data, language, (som) => formatPrice(som, language), amountAfterDiscount);
}

export function useSaveDeliverySettings(): UseMutationResult<void, Error, DeliverySettings> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveDeliverySettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.delivery }),
  });
}

// --- Payment settings (card transfer) -------------------------------------

export function usePaymentSettings(): UseQueryResult<PaymentSettings | null> {
  return useQuery({ queryKey: contentKeys.payment, queryFn: getPaymentSettings });
}

export function useSavePaymentSettings(): UseMutationResult<void, Error, PaymentSettings> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePaymentSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.payment }),
  });
}

// --- Favorites --------------------------------------------------------------

export interface FavoritesState {
  ids: ReadonlySet<string>;
  ordered: string[];
  isLoading: boolean;
  toggle: (productId: string) => Promise<void>;
}

/** Live favorites of a signed-in user; an empty, inert set when signed out. */
export function useFavorites(uid: string | undefined): FavoritesState {
  // The snapshot is tagged with the uid it belongs to, so a sign-out or account
  // switch shows nothing stale — state is only ever set from the listener.
  const [snapshot, setSnapshot] = useState<{ uid: string; ids: string[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeFavorites(uid, (ids) => setSnapshot({ uid, ids }));
  }, [uid]);

  const ordered = uid && snapshot?.uid === uid ? snapshot.ids : [];
  const ids = new Set(ordered);
  return {
    ids,
    ordered,
    isLoading: !!uid && snapshot?.uid !== uid,
    toggle: async (productId) => {
      if (!uid) return;
      await setFavorite(uid, productId, !ids.has(productId));
    },
  };
}
