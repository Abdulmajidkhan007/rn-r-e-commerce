import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { tokens } from '@kidswear/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Reusable centered empty state for admin tables (no data / filtered to nothing). */
export function EmptyState({ title, description, icon, action }: EmptyStateProps): React.ReactElement {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: 'center', py: `${tokens.spacing['4xl']}px`, px: 2, textAlign: 'center' }}
    >
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        {icon ?? <InboxOutlinedIcon sx={{ fontSize: 64 }} />}
      </Box>
      <Typography variant="h5">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  );
}
