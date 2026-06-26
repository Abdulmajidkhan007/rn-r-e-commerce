import { Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { Product } from '@kidswear/core';
import { PriceTag, Rating } from '@/components';
import { useLocalized } from '@/lib/useLocalized';
import { StockBadge } from './StockBadge';

export function ProductCard({ product }: { product: Product }): React.ReactElement {
  const localized = useLocalized();
  const image = product.images[0];

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={RouterLink} to={`/product/${product.id}`} sx={{ height: '100%' }}>
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={image}
            alt={localized(product.name)}
            sx={{ aspectRatio: '3 / 4', objectFit: 'cover', bgcolor: 'action.hover' }}
          />
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <StockBadge stock={product.stock} />
          </Box>
        </Box>
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" noWrap title={localized(product.name)}>
              {localized(product.name)}
            </Typography>
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
            <Rating value={product.rating} size="small" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
