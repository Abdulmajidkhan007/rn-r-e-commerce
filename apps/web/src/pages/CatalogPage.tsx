import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCategories, useProducts, type ProductSort } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductCardSkeleton } from '@/components/catalog/ProductCardSkeleton';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { useLocalized } from '@/lib/useLocalized';
import { useDebounced } from '@/lib/useDebounced';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const SORTS: ProductSort[] = ['newest', 'priceAsc', 'priceDesc'];
const SORT_LABEL = {
  newest: 'catalog.newest',
  priceAsc: 'catalog.priceLowHigh',
  priceDesc: 'catalog.priceHighLow',
} as const;

const PRODUCT_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 3,
} as const;

export default function CatalogPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('nav.catalog'));
  const localized = useLocalized();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ProductSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = useDebounced(searchInput);

  const params = useMemo(() => ({ categoryId, search, sort }), [categoryId, search, sort]);
  const { products, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useProducts(params);

  const handleSort = (e: SelectChangeEvent): void => {
    setSort(e.target.value as ProductSort);
  };

  const sortSelect = (
    <Select value={sort} onChange={handleSort} size="small" sx={{ minWidth: 180 }}>
      {SORTS.map((s) => (
        <MenuItem key={s} value={s}>
          {t(SORT_LABEL[s])}
        </MenuItem>
      ))}
    </Select>
  );

  const stickyBarSx = {
    position: 'sticky' as const,
    zIndex: 2,
    py: 1.5,
    backgroundColor: alpha(theme.palette.background.default, 0.85),
    backdropFilter: 'blur(8px)',
  };

  const results = isError ? (
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
    <Box sx={PRODUCT_GRID_SX}>
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </Box>
  ) : products.length === 0 ? (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography color="text.secondary">{t('catalog.noProducts')}</Typography>
    </Box>
  ) : (
    <>
      <Box sx={PRODUCT_GRID_SX}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </Box>

      {hasNextPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Button
            variant="outlined"
            size="large"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? t('catalog.loading') : t('catalog.loadMore')}
          </Button>
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
      <Box sx={{ py: `${tokens.spacing['2xl']}px` }}>
        <Typography variant="h1">{t('nav.catalog')}</Typography>
        <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
          {isLoading ? ' ' : `${products.length} ${t('catalog.products').toLowerCase()}`}
        </Typography>
      </Box>

      {isDesktop ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 4, alignItems: 'flex-start' }}>
          <Box sx={{ position: 'sticky', top: 96 }}>
            <CatalogFilters categoryId={categoryId} onCategoryChange={setCategoryId} />
          </Box>

          <Box>
            <Stack direction="row" spacing={2} sx={{ ...stickyBarSx, top: 80, alignItems: 'center' }}>
              <TextField
                label={t('catalog.search')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              {sortSelect}
            </Stack>
            <Box sx={{ pt: 3, pb: 6 }}>{results}</Box>
          </Box>
        </Box>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}
          >
            <Chip
              label={t('catalog.allCategories')}
              color={categoryId === undefined ? 'primary' : 'default'}
              onClick={() => setCategoryId(undefined)}
              sx={{ flexShrink: 0 }}
            />
            {(categoriesQuery.data ?? []).map((category) => (
              <Chip
                key={category.id}
                label={localized(category.name)}
                color={categoryId === category.id ? 'primary' : 'default'}
                onClick={() => setCategoryId(category.id)}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Stack>

          <Stack spacing={1} sx={{ ...stickyBarSx, top: 56 }}>
            <TextField
              label={t('catalog.search')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              {sortSelect}
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFiltersOpen(true)}
              >
                {t('catalog.category')}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ pt: 3, pb: 6 }}>{results}</Box>

          <Drawer anchor="right" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
            <Box sx={{ width: 280, p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
                <IconButton onClick={() => setFiltersOpen(false)} aria-label="close filters">
                  <CloseIcon />
                </IconButton>
              </Stack>
              <CatalogFilters
                categoryId={categoryId}
                onCategoryChange={(id) => {
                  setCategoryId(id);
                  setFiltersOpen(false);
                }}
              />
            </Box>
          </Drawer>
        </>
      )}
    </Box>
  );
}
