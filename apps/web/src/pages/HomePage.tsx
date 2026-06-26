import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useTranslation } from '@kidswear/i18n';
import {
  Button,
  Card,
  PriceTag,
  Rating,
  QuantityStepper,
  Input,
  Skeleton,
  Avatar,
  Badge,
} from '@/components';

/** Home placeholder that also showcases the themed UI primitives. */
export default function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  const [qty, setQty] = useState(1);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          {t('appName')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('nav.home')} · Phase 0 skeleton
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <Stack spacing={2}>
              <Typography variant="h6">UI primitives</Typography>
              <PriceTag price={189000} compareAtPrice={249000} size="lg" />
              <Rating value={4.5} />
              <QuantityStepper value={qty} onChange={setQty} />
              <Input label={t('actions.search')} placeholder="..." />
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Button>{t('actions.addToCart')}</Button>
                <Badge badgeContent={qty} color="primary">
                  <Avatar>K</Avatar>
                </Badge>
              </Stack>
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <Stack spacing={2}>
              <Typography variant="h6">Loading state</Typography>
              <Skeleton variant="rectangular" height={120} />
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
