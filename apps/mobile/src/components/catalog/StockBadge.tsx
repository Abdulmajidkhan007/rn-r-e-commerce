import { Chip } from 'react-native-paper';
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';

const STATUS = {
  in: { key: 'catalog.inStock', icon: 'check-circle' },
  low: { key: 'catalog.lowStock', icon: 'alert-circle' },
  out: { key: 'catalog.outOfStock', icon: 'close-circle' },
} as const;

export function StockBadge({ stock }: { stock: number }): React.ReactElement {
  const { t } = useTranslation();
  const status = stockStatus(stock);
  const { key, icon } = STATUS[status];
  return (
    <Chip compact icon={icon}>
      {t(key)}
    </Chip>
  );
}
