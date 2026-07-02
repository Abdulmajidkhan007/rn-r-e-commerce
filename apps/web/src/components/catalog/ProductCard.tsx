import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { Product } from '@kidswear/core';
import { stockStatus } from '@kidswear/utils';
import { tokens } from '@kidswear/theme';
import { PriceTag } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { StockBadge } from './StockBadge';

export function ProductCard({ product }: { product: Product }): React.ReactElement {
  const localized = useLocalized();
  const theme = useTheme();
  const image = product.images[0];
  const isOut = stockStatus(product.stock) === 'out';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        transition: theme.transitions.create(['transform', 'box-shadow'], {
          duration: tokens.durations.normal,
          easing: tokens.easings.standard,
        }),
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: tokens.elevations.md.shadow,
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={`/product/${product.id}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={image}
            alt={localized(product.name)}
            sx={{
              aspectRatio: '4 / 5',
              objectFit: 'cover',
              borderRadius: `${tokens.radii.lg}px`,
              bgcolor: 'action.hover',
              filter: isOut ? 'grayscale(0.8)' : 'none',
            }}
          />
          <Box sx={{ position: 'absolute', top: tokens.spacing.sm, right: tokens.spacing.sm }}>
            <StockBadge stock={product.stock} />
          </Box>
        </Box>
        <CardContent sx={{ width: '100%' }}>
          <Stack spacing={0.75}>
            <Typography
              variant="body2"
              title={localized(product.name)}
              sx={{
                fontWeight: tokens.fontWeights.medium,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.6em',
              }}
            >
              {localized(product.name)}
            </Typography>
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
