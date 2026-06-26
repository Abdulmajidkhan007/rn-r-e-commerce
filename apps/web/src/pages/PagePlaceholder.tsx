import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export interface PagePlaceholderProps {
  title: string;
  subtitle?: string;
}

/** Phase 0 placeholder rendering a page's name. Real content arrives later. */
export function PagePlaceholder({ title, subtitle }: PagePlaceholderProps): React.ReactElement {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Chip label="Phase 0 · placeholder" size="small" color="primary" variant="outlined" />
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Stack>
  );
}
