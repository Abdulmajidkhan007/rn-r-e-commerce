import { Link as RouterLink, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from '@kidswear/i18n';
import { LanguageSwitcher, ThemeToggle } from '@/components';

/** Centered card layout for auth screens. */
export function AuthLayout(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{ fontWeight: 800, color: 'primary.main', textDecoration: 'none' }}
          >
            {t('appName')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LanguageSwitcher />
            <ThemeToggle />
          </Stack>
        </Stack>
        <Card variant="outlined">
          <CardContent sx={{ p: 4 }}>
            <Outlet />
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
