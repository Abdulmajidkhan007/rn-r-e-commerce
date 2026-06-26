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
}: {
  stock: number;
  size?: 'small' | 'medium';
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
    />
  );
}
