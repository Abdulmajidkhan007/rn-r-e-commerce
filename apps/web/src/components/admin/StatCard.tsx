import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { tokens } from '@kidswear/theme';

export type StatCardAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

export interface StatCardProps {
  label: string;
  value: string;
  accent?: StatCardAccent;
  hint?: string;
}

/** Admin dashboard stat tile: label, big value, and a decorative accent trend bar. */
export function StatCard({
  label,
  value,
  accent = 'primary',
  hint,
}: StatCardProps): React.ReactElement {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;

  return (
    <Card
      variant="outlined"
      sx={{
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: theme.transitions.create(['transform', 'box-shadow'], {
          duration: tokens.durations.fast,
          easing: tokens.easings.standard,
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: tokens.elevations.md.shadow,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: tokens.spacing.lg,
          right: tokens.spacing.lg,
          width: 48,
          height: 4,
          borderRadius: `${tokens.radii.full}px`,
          bgcolor: alpha(accentColor, 0.15),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '60%',
            height: '100%',
            bgcolor: accentColor,
            borderRadius: `${tokens.radii.full}px`,
          }}
        />
      </Box>

      <Stack spacing={0.75}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
