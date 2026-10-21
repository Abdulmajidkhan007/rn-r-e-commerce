import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { tokens } from '@kidswear/theme';
import { ProductImage } from '@/components/ProductImage';

export interface ProductGalleryProps {
  images: string[];
  alt: string;
}

/** Large main image with a thumbnail strip; selected thumbnail is outlined. */
export function ProductGallery({ images, alt }: ProductGalleryProps): React.ReactElement {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected] ?? images[0];

  return (
    <Stack spacing={1.5}>
      <ProductImage
        src={activeImage}
        alt={alt}
        sx={{ width: '100%', aspectRatio: '4 / 5', borderRadius: `${tokens.radii.xl}px` }}
      />
      {images.length > 1 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {images.map((img, i) => (
            <Box
              key={img}
              component="button"
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`${alt} ${i + 1}`}
              sx={{
                p: 0,
                flexShrink: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <ProductImage
                src={img}
                alt=""
                sx={{
                  width: 72,
                  height: 90,
                  borderRadius: `${tokens.radii.md}px`,
                  border: '2px solid',
                  borderColor: i === selected ? 'primary.main' : 'transparent',
                  transition: `border-color ${tokens.durations.fast}ms ${tokens.easings.standard}`,
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
