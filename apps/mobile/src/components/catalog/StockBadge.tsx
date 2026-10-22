import { View } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import { stockStatus } from '@kidswear/utils';
import { tokens } from '@kidswear/theme';
import { useTranslation } from '@kidswear/i18n';

const STATUS = {
  in: { key: 'catalog.inStock', icon: 'check-circle' },
  low: { key: 'catalog.lowStock', icon: 'alert-circle' },
  out: { key: 'catalog.outOfStock', icon: 'close-circle' },
} as const;

export function StockBadge({
  stock,
  dense = false,
}: {
  stock: number;
  /** Small pill without icon, for overlays on product photos. */
  dense?: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const status = stockStatus(stock);
  const { key, icon } = STATUS[status];

  if (dense) {
    const { background, foreground } = {
      in: {
        background: theme.colors.primaryContainer,
        foreground: theme.colors.onPrimaryContainer,
      },
      low: {
        background: theme.colors.tertiaryContainer,
        foreground: theme.colors.onTertiaryContainer,
      },
      out: { background: theme.colors.surfaceVariant, foreground: theme.colors.onSurfaceVariant },
    }[status];
    return (
      <View
        style={{
          backgroundColor: background,
          borderRadius: tokens.radii.full,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing['2xs'],
        }}
      >
        <Text variant="labelSmall" numberOfLines={1} style={{ color: foreground }}>
          {t(key)}
        </Text>
      </View>
    );
  }

  return (
    <Chip compact icon={icon}>
      {t(key)}
    </Chip>
  );
}
