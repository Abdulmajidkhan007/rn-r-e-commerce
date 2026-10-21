import Chip from '@mui/material/Chip';
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';

const STATUS = {
  in: { key: 'catalog.inStock', color: 'success' },
  low: { key: 'catalog.lowStock', color: 'warning' },
  out: { key: 'catalog.outOfStock', color: 'default' },
} as const;

export function StockBadge({
  stock,
  size = 'small',
  dense = false,
}: {
  stock: number;
  size?: 'small' | 'medium';
  /** Compact pill for overlays on product photos. */
  dense?: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const status = stockStatus(stock);
  const { key, color } = STATUS[status];
  return (
    <Chip
      size={size}
      color={color}
      variant={status === 'out' ? 'outlined' : 'filled'}
      label={t(key)}
      sx={dense ? { height: 22, '& .MuiChip-label': { px: 1, fontSize: '0.6875rem' } } : undefined}
    />
  );
}
