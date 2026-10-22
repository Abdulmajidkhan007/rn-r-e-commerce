import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import { ADMIN_REVIEWS_LIMIT, type Review, type ReviewStatus } from '@kidswear/core';
import {
  reviewErrorKey,
  useAdminProducts,
  useAdminReviews,
  useModerateReview,
  useRecomputeRatings,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Rating } from '@/components';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { useLocalized } from '@/lib/useLocalized';

type Filter = ReviewStatus | 'all';

export default function AdminReviewsPage(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const [filter, setFilter] = useState<Filter>('all');
  const { data: reviews = [], isLoading } = useAdminReviews(filter);
  const { data: products = [] } = useAdminProducts();
  const moderate = useModerateReview();
  const recompute = useRecomputeRatings();
  const [deleting, setDeleting] = useState<Review | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  const productNames = useMemo(
    () => new Map(products.map((p) => [p.id, localized(p.name)] as const)),
    [products, localized],
  );

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="h2">{t('reviews.admin.title')}</Typography>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
          disabled={recompute.isPending}
          onClick={() =>
            recompute.mutate(undefined, {
              onSuccess: (count) => setNotice(t('reviews.admin.recomputed', { count })),
            })
          }
        >
          {t('reviews.admin.recompute')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t('reviews.admin.ratingHint')}
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_, next: Filter | null) => next && setFilter(next)}
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value="all">{t('reviews.admin.all')}</ToggleButton>
        <ToggleButton value="visible">{t('reviews.admin.visible')}</ToggleButton>
        <ToggleButton value="hidden">{t('reviews.admin.hidden')}</ToggleButton>
      </ToggleButtonGroup>

      {(moderate.error ?? recompute.error) && (
        <Alert severity="error">{tk(reviewErrorKey(moderate.error ?? recompute.error))}</Alert>
      )}

      {isLoading ? (
        <TableSkeleton rows={4} columns={1} />
      ) : reviews.length === 0 ? (
        <EmptyState title={t('reviews.admin.noReviews')} />
      ) : (
        reviews.map((r) => (
          <Card
            key={r.id}
            variant="outlined"
            sx={{ boxShadow: 'none', opacity: r.status === 'hidden' ? 0.75 : 1 }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Rating
                      value={r.rating}
                      size="small"
                      aria-label={t('reviews.ratingAria', { value: r.rating })}
                    />
                    <Typography variant="subtitle2">{r.authorName}</Typography>
                    {r.status === 'hidden' && (
                      <Chip size="small" color="warning" label={t('reviews.admin.hidden')} />
                    )}
                    {r.featured && (
                      <Chip size="small" color="primary" label={t('reviews.admin.featured')} />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(r.createdAt, language)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t('reviews.admin.product')}:{' '}
                  <Link component={RouterLink} to={`/product/${r.productId}`}>
                    {productNames.get(r.productId) ?? r.productId}
                  </Link>{' '}
                  · {t('reviews.admin.order')} #{r.orderId.slice(0, 8)}
                </Typography>
                {r.text && (
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {r.text}
                  </Typography>
                )}
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    size="small"
                    disabled={moderate.isPending}
                    startIcon={r.status === 'visible' ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    onClick={() =>
                      moderate.mutate({
                        reviewId: r.id,
                        status: r.status === 'visible' ? 'hidden' : 'visible',
                      })
                    }
                  >
                    {r.status === 'visible' ? t('reviews.admin.hide') : t('reviews.admin.show')}
                  </Button>
                  <Button
                    size="small"
                    disabled={moderate.isPending}
                    startIcon={r.featured ? <StarIcon /> : <StarBorderIcon />}
                    onClick={() => moderate.mutate({ reviewId: r.id, featured: !r.featured })}
                  >
                    {r.featured ? t('reviews.admin.unfeature') : t('reviews.admin.feature')}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={moderate.isPending}
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleting(r)}
                  >
                    {t('reviews.admin.delete')}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}

      {reviews.length >= ADMIN_REVIEWS_LIMIT && (
        <Typography variant="caption" color="text.secondary">
          {t('reviews.admin.limitNote', { count: ADMIN_REVIEWS_LIMIT })}
        </Typography>
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t('reviews.admin.delete')}
        message={t('reviews.admin.confirmDelete')}
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) moderate.mutate({ reviewId: deleting.id, remove: true });
          setDeleting(undefined);
        }}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
      />
    </Stack>
  );
}
