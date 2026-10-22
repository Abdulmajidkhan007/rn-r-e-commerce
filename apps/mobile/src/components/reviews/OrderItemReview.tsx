import { useState } from 'react';
import { View } from 'react-native';
import { Button, Portal, Snackbar, Text, useTheme } from 'react-native-paper';
import {
  REVIEW_EDIT_WINDOW_MS,
  authorDisplayName,
  canEditReview,
  type Order,
  type Review,
  type ReviewFormValues,
} from '@kidswear/core';
import { reviewErrorKey, useEditReview, useSubmitReview } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Rating } from '@/components/Rating';
import { useNow } from '@/lib/useNow';
import { ReviewFormDialog } from './ReviewFormDialog';

export interface OrderItemReviewProps {
  order: Pick<Order, 'id' | 'status' | 'items'>;
  productId: string;
  productName: string;
  userId: string;
  displayName: string;
  /** The owner's existing review of this line, if any. */
  review: Review | undefined;
}

/**
 * Under a delivered order line: "Write a review", or the posted stars with
 * "Edit" while the 7-day window is open.
 */
export function OrderItemReview({
  order,
  productId,
  productName,
  userId,
  displayName,
  review,
}: OrderItemReviewProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppSelector((s) => s.ui.language);
  const now = useNow();
  const submit = useSubmitReview();
  const edit = useEditReview();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const mutation = review ? edit : submit;
  const editable = review ? canEditReview(review, now) : false;

  const save = (values: ReviewFormValues): void => {
    const done = {
      onSuccess: () => {
        setOpen(false);
        setSent(true);
      },
    };
    if (review) {
      edit.mutate({ review, values }, done);
    } else {
      submit.mutate(
        {
          order,
          productId,
          userId,
          authorName: authorDisplayName(displayName, t('reviews.anonymous')),
          values,
        },
        done,
      );
    }
  };

  const openForm = (): void => {
    mutation.reset();
    setOpen(true);
  };

  return (
    <View style={{ gap: 4 }}>
      {review ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('reviews.yourReview')}
          </Text>
          <Rating value={review.rating} size={14} />
          {editable ? (
            <Button compact onPress={openForm}>
              {t('reviews.edit')}
            </Button>
          ) : null}
        </View>
      ) : (
        <Button
          compact
          mode="outlined"
          icon="message-star-outline"
          onPress={openForm}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('reviews.write')}
        </Button>
      )}
      {review?.status === 'hidden' ? (
        <Text variant="labelSmall" style={{ color: theme.colors.error }}>
          {t('reviews.hiddenNotice')}
        </Text>
      ) : null}
      {review && editable ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('reviews.editUntil', {
            date: formatDate(review.createdAt + REVIEW_EDIT_WINDOW_MS, language),
          })}
        </Text>
      ) : null}

      {open ? (
        <ReviewFormDialog
          productName={productName}
          initial={review ? { rating: review.rating, text: review.text } : undefined}
          pending={mutation.isPending}
          errorKey={mutation.error ? reviewErrorKey(mutation.error) : null}
          onSubmit={save}
          onDismiss={() => setOpen(false)}
        />
      ) : null}

      <Portal>
        <Snackbar visible={sent} onDismiss={() => setSent(false)} duration={2500}>
          {t('reviews.sent')}
        </Snackbar>
      </Portal>
    </View>
  );
}
