import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { CartItem } from '@kidswear/core';
import { formatPrice } from '@kidswear/utils';
import { useTranslation, type SupportedLanguage } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { PriceTag, QuantityStepper } from '@/components';

export interface CartLineProps {
  item: CartItem;
  language: SupportedLanguage;
  onQtyChange: (quantity: number) => void;
  onRemove: () => void;
}

/** One cart row: thumbnail, name/variant/price, and quantity + remove controls. */
export function CartLine({
  item,
  language,
  onQtyChange,
  onRemove,
}: CartLineProps): React.ReactElement {
  const { t } = useTranslation();
  const lineTotal = item.price * item.quantity;

  return (
    <Box sx={{ display: 'flex', gap: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box
        component="img"
        src={item.image}
        alt={item.name}
        sx={{
          width: 80,
          height: 100,
          objectFit: 'cover',
          borderRadius: `${tokens.radii.md}px`,
          bgcolor: 'action.hover',
          flexShrink: 0,
        }}
      />

      <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap title={item.name}>
          {item.name}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={item.size} size="small" variant="outlined" />
          <Chip label={item.color} size="small" variant="outlined" />
        </Stack>
        <PriceTag price={item.price} size="sm" />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{ alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}
      >
        <IconButton
          size="small"
          aria-label={t('cart.remove')}
          onClick={onRemove}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
          <QuantityStepper value={item.quantity} onChange={onQtyChange} min={1} max={99} />
          <Typography variant="caption" color="text.secondary">
            {formatPrice(lineTotal, language)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
