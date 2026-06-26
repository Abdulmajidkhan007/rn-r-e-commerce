import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useCategories, useProducts, type ProductSort } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import { useDebounced } from '@/lib/useDebounced';

const SORTS: ProductSort[] = ['newest', 'priceAsc', 'priceDesc'];
const SORT_LABEL = {
  newest: 'catalog.newest',
  priceAsc: 'catalog.priceLowHigh',
  priceDesc: 'catalog.priceHighLow',
} as const;

export default function CatalogPage(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ProductSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput);

  const params = useMemo(() => ({ categoryId, search, sort }), [categoryId, search, sort]);
  const { products, isLoading, isError, refetch } = useProducts(params);

  const handleSort = (e: SelectChangeEvent): void => {
    setSort(e.target.value as ProductSort);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('catalog.products')}
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <TextField
          label={t('catalog.search')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <Select value={sort} onChange={handleSort} size="small" sx={{ minWidth: 200 }}>
          {SORTS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(SORT_LABEL[s])}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={t('catalog.allCategories')}
          color={categoryId === undefined ? 'primary' : 'default'}
          onClick={() => setCategoryId(undefined)}
        />
        {(categoriesQuery.data ?? []).map((category) => (
          <Chip
            key={category.id}
            label={localized(category.name)}
            color={categoryId === category.id ? 'primary' : 'default'}
            onClick={() => setCategoryId(category.id)}
          />
        ))}
      </Stack>

      {isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              {t('catalog.retry')}
            </Button>
          }
        >
          {t('catalog.loadError')}
        </Alert>
      ) : isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
              <Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', borderRadius: 2 }} />
              <Skeleton sx={{ mt: 1 }} width="80%" />
              <Skeleton width="40%" />
            </Grid>
          ))}
        </Grid>
      ) : products.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('catalog.noProducts')}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {products.map((product) => (
            <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
