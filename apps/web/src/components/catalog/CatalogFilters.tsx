import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';
import { useCategoriesWithProducts, useSizeOptions } from '@kidswear/data';
import { AGE_BANDS, GENDERS, type CatalogFilters as Filters } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { useLocalized } from '@/lib/useLocalized';

export interface CatalogFiltersProps {
  categoryId: string | undefined;
  onCategoryChange: (categoryId: string | undefined) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

/** Category filter list — shared by the desktop sidebar and the mobile filter drawer. */
export function CatalogFilters({
  categoryId,
  onCategoryChange,
  filters,
  onFiltersChange,
}: CatalogFiltersProps): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const theme = useTheme();
  const sizesQuery = useSizeOptions(categoryId);
  const categoriesQuery = useCategoriesWithProducts();

  const itemSx = (active: boolean): object => ({
    borderRadius: `${tokens.radii.md}px`,
    px: 1.5,
    py: 1,
    color: active ? 'primary.main' : 'text.primary',
    fontWeight: active ? tokens.fontWeights.semibold : tokens.fontWeights.regular,
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: tokens.durations.fast,
      easing: tokens.easings.standard,
    }),
  });

  const set = (patch: Partial<Filters>): void => onFiltersChange({ ...filters, ...patch });
  const parsePrice = (raw: string): number | undefined => {
    const n = Number(raw.replace(/\s/g, ''));
    return raw.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : Math.round(n);
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  const GENDER_LABEL = {
    boys: 'catalog.boys',
    girls: 'catalog.girls',
    unisex: 'catalog.unisex',
  } as const;
  const overline = (label: string): React.ReactElement => (
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', letterSpacing: tokens.letterSpacings.wide, px: 1.5 }}
    >
      {label}
    </Typography>
  );

  return (
    <Stack spacing={1}>
      {overline(t('catalog.category'))}
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <ListItemButton
          disableGutters
          selected={categoryId === undefined}
          onClick={() => onCategoryChange(undefined)}
          sx={itemSx(categoryId === undefined)}
        >
          <ListItemText primary={t('catalog.allCategories')} />
        </ListItemButton>
        {(categoriesQuery.data ?? []).map((category) => (
          <ListItemButton
            key={category.id}
            disableGutters
            selected={categoryId === category.id}
            onClick={() => onCategoryChange(category.id)}
            sx={itemSx(categoryId === category.id)}
          >
            <ListItemText primary={localized(category.name)} />
          </ListItemButton>
        ))}
      </List>

      {(sizesQuery.data ?? []).length > 0 && (
        <>
          {overline(t('catalog.size'))}
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75, px: 1.5 }}>
            {(sizesQuery.data ?? []).map((size) => (
              <Chip
                key={size}
                size="small"
                label={size}
                color={filters.size === size ? 'primary' : 'default'}
                onClick={() => set({ size: filters.size === size ? undefined : size })}
              />
            ))}
          </Stack>
        </>
      )}

      {overline(t('catalog.gender'))}
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75, px: 1.5 }}>
        {GENDERS.map((g) => (
          <Chip
            key={g}
            size="small"
            label={t(GENDER_LABEL[g])}
            color={filters.gender === g ? 'primary' : 'default'}
            onClick={() => set({ gender: filters.gender === g ? undefined : g })}
          />
        ))}
      </Stack>

      {overline(t('catalog.age'))}
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75, px: 1.5 }}>
        {AGE_BANDS.map((band) => (
          <Chip
            key={band.key}
            size="small"
            label={t('catalog.ageYears', { band: band.key })}
            color={filters.ageBand === band.key ? 'primary' : 'default'}
            onClick={() => set({ ageBand: filters.ageBand === band.key ? undefined : band.key })}
          />
        ))}
      </Stack>

      {overline(t('catalog.price'))}
      <Stack direction="row" spacing={1} sx={{ px: 1.5 }}>
        <TextField
          size="small"
          label={t('catalog.priceMin')}
          value={filters.priceMin ?? ''}
          onChange={(e) => set({ priceMin: parsePrice(e.target.value) })}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'price-min' } }}
        />
        <TextField
          size="small"
          label={t('catalog.priceMax')}
          value={filters.priceMax ?? ''}
          onChange={(e) => set({ priceMax: parsePrice(e.target.value) })}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'price-max' } }}
        />
      </Stack>

      {hasFilters && (
        <Button size="small" onClick={() => onFiltersChange({})} sx={{ alignSelf: 'flex-start' }}>
          {t('catalog.clearFilters')}
        </Button>
      )}
    </Stack>
  );
}
