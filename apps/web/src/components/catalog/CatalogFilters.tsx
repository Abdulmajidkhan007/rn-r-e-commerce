import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';
import { useCategories } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { useLocalized } from '@/lib/useLocalized';

export interface CatalogFiltersProps {
  categoryId: string | undefined;
  onCategoryChange: (categoryId: string | undefined) => void;
}

/** Category filter list — shared by the desktop sidebar and the mobile filter drawer. */
export function CatalogFilters({
  categoryId,
  onCategoryChange,
}: CatalogFiltersProps): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const theme = useTheme();
  const categoriesQuery = useCategories();

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

  return (
    <Stack spacing={1}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', letterSpacing: tokens.letterSpacings.wide, px: 1.5 }}
      >
        {t('catalog.category')}
      </Typography>
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
    </Stack>
  );
}
