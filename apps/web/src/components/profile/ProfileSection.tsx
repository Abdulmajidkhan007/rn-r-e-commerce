import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Card } from '@/components';

export interface ProfileSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Labeled wrapper (heading + caption + card body) reused by every profile section. */
export function ProfileSection({
  title,
  description,
  children,
}: ProfileSectionProps): React.ReactElement {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: description ? 0 : 1 }}>
        <Card>{children}</Card>
      </Box>
    </Box>
  );
}
