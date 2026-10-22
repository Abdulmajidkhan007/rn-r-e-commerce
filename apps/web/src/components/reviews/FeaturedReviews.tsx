import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useFeaturedReviews } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { ReviewCard } from './ReviewCard';

/** Home page "Mijozlar fikri": admin-featured visible reviews; hidden when there are none. */
export function FeaturedReviews(): React.ReactElement | null {
  const { t } = useTranslation();
  const { data: reviews = [] } = useFeaturedReviews();
  if (reviews.length === 0) return null;

  return (
    <Stack component="section" spacing={2} aria-labelledby="featured-reviews">
      <Stack spacing={0.5}>
        <Typography id="featured-reviews" variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {t('reviews.featuredTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('reviews.featuredSubtitle')}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {reviews.map((review) => (
          <Grid key={review.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ReviewCard review={review} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
