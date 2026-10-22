import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Review } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Card, Rating } from '@/components';

export interface ReviewCardProps {
  review: Pick<Review, 'authorName' | 'rating' | 'text' | 'createdAt'>;
}

/** One review: stars, author, date and text. */
export function ReviewCard({ review }: ReviewCardProps): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  return (
    <Card>
      <Stack spacing={1}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
        >
          <Rating
            value={review.rating}
            size="small"
            aria-label={t('reviews.ratingAria', { value: review.rating })}
          />
          <Typography variant="caption" color="text.secondary">
            {formatDate(review.createdAt, language)}
          </Typography>
        </Stack>
        {review.text && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {review.text}
          </Typography>
        )}
        <Typography variant="subtitle2">{review.authorName}</Typography>
      </Stack>
    </Card>
  );
}
