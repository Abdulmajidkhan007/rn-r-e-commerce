import { useState } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import { useImageSrc } from '@kidswear/data';

export interface ProductImageProps {
  /** A stored product image: https URL or `kwimg:<id>`. Missing → placeholder. */
  src: string | undefined;
  alt: string;
  /** Sizing/shape of the frame (aspectRatio or width/height, borderRadius…). */
  sx?: SxProps<Theme>;
}

/**
 * Product photo in a fixed frame. The frame keeps its size whether the photo
 * is loading, missing or broken, so cards and rows never collapse; without a
 * photo it shows a hanger icon on the theme's neutral surface (dark/light aware).
 */
export function ProductImage({ src, alt, sx }: ProductImageProps): React.ReactElement {
  const { uri, isLoading } = useImageSrc(src);
  const [failedUri, setFailedUri] = useState<string | undefined>(undefined);
  const showImage = uri !== undefined && uri !== failedUri;

  return (
    <Box
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          bgcolor: 'action.hover',
          color: 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {showImage ? (
        <Box
          component="img"
          src={uri}
          alt={alt}
          loading="lazy"
          onError={() => setFailedUri(uri)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : isLoading ? null : (
        <CheckroomOutlinedIcon
          // Labels the placeholder for screen readers; '' keeps it decorative.
          {...(alt ? { titleAccess: alt } : {})}
          sx={{ width: '36%', height: 'auto', maxWidth: 96, minWidth: 20 }}
        />
      )}
    </Box>
  );
}
