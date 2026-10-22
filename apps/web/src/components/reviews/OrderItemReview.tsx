import { useState } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RateReviewIcon from '@mui/icons-material/RateReview';
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
import { Rating } from '@/components';
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
  const language = useAppSelector((s) => s.ui.language);
  const now = useNow();
  const submit = useSubmitReview();
  const edit = useEditReview();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const mutation = review ? edit : submit;

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

  const editable = review ? canEditReview(review, now) : false;

  return (
    <>
      {review ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {t('reviews.yourReview')}
          </Typography>
          <Rating
            value={review.rating}
            size="small"
            aria-label={t('reviews.ratingAria', { value: review.rating })}
          />
          {review.status === 'hidden' && (
            <Typography variant="caption" color="warning.main">
              {t('reviews.hiddenNotice')}
            </Typography>
          )}
          {editable && (
            <Button
              size="small"
              onClick={() => {
                edit.reset();
                setOpen(true);
              }}
            >
              {t('reviews.edit')}
            </Button>
          )}
          {editable && (
            <Typography variant="caption" color="text.secondary">
              {t('reviews.editUntil', {
                date: formatDate(review.createdAt + REVIEW_EDIT_WINDOW_MS, language),
              })}
            </Typography>
          )}
        </Stack>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={<RateReviewIcon />}
          onClick={() => {
            submit.reset();
            setOpen(true);
          }}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('reviews.write')}
        </Button>
      )}

      {open && (
        <ReviewFormDialog
          open
          productName={productName}
          initial={review ? { rating: review.rating, text: review.text } : undefined}
          pending={mutation.isPending}
          errorKey={mutation.error ? reviewErrorKey(mutation.error) : null}
          onSubmit={save}
          onClose={() => setOpen(false)}
        />
      )}

      <Snackbar
        open={sent}
        autoHideDuration={2500}
        onClose={() => setSent(false)}
        message={t('reviews.sent')}
      />
    </>
  );
}
