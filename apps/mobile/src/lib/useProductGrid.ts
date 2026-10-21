import { useWindowDimensions } from 'react-native';
import { tokens } from '@kidswear/theme';

const TABLET_MIN = 600;
const WIDE_MIN = 900;

export interface ProductGrid {
  columns: number;
  /** Fixed card width, so a lone last item is never wider than its neighbours. */
  cardWidth: number;
}

/** Column count and exact card width for a screen padded by `tokens.spacing.lg` per side. */
export function useProductGrid(): ProductGrid {
  const { width } = useWindowDimensions();
  const columns = width >= WIDE_MIN ? 4 : width >= TABLET_MIN ? 3 : 2;
  const gap = tokens.spacing.md;
  const inner = width - tokens.spacing.lg * 2;
  return { columns, cardWidth: Math.floor((inner - gap * (columns - 1)) / columns) };
}
