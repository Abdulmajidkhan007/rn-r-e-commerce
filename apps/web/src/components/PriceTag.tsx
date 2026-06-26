import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';

export interface PriceTagProps {
  /** Price in UZS integer som. */
  price: number;
  /** Optional original price to show struck-through. */
  compareAtPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT = {
  sm: 'body2',
  md: 'subtitle1',
  lg: 'h6',
} as const;

/** Displays a UZS price (and optional discounted-from price) in the active locale. */
export function PriceTag({ price, compareAtPrice, size = 'md' }: PriceTagProps): React.ReactElement {
  const language = useAppSelector((s) => s.ui.language);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
      <Typography variant={VARIANT[size]} color="text.primary" sx={{ fontWeight: 700 }}>
        {formatPrice(price, language)}
      </Typography>
      {compareAtPrice !== undefined && compareAtPrice > price && (
        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
          {formatPrice(compareAtPrice, language)}
        </Typography>
      )}
    </Stack>
  );
}
