import Box from '@mui/material/Box';
import { tokens } from '@kidswear/theme';
import { Skeleton } from '@/components';

/** Loading placeholder matching ProductCard's shape (4:5 image + two text lines). */
export function ProductCardSkeleton(): React.ReactElement {
  return (
    <Box>
      <Skeleton
        variant="rectangular"
        sx={{ width: '100%', aspectRatio: '4 / 5', borderRadius: `${tokens.radii.lg}px` }}
      />
      <Box sx={{ pt: 1.5, px: 0.5 }}>
        <Skeleton width="85%" height={20} />
        <Skeleton width="40%" height={20} />
      </Box>
    </Box>
  );
}
