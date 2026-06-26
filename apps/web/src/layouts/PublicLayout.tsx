import { Link as RouterLink, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAppSelector } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { Badge, LanguageSwitcher, ThemeToggle } from '@/components';

const NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/catalog', key: 'nav.catalog' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/contact', key: 'nav.contact' },
] as const;

/** Public-facing layout: header with nav, language, theme, cart; and a footer. */
export function PublicLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ fontWeight: 800, color: 'primary.main', textDecoration: 'none' }}
          >
            {t('appName')}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}
          >
            {NAV.map((item) => (
              <Button key={item.to} component={RouterLink} to={item.to} color="inherit">
                {t(item.key)}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <LanguageSwitcher />
          <ThemeToggle />
          <IconButton component={RouterLink} to="/cart" aria-label={t('nav.cart')} color="inherit">
            <Badge badgeContent={cartCount} color="primary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
          {isAdmin && (
            <Button
              component={RouterLink}
              to="/admin"
              color="inherit"
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {t('nav.admin')}
            </Button>
          )}
          {isAuthenticated ? (
            <IconButton
              component={RouterLink}
              to="/profile"
              aria-label={t('nav.profile')}
              color="inherit"
            >
              <AccountCircleIcon />
            </IconButton>
          ) : (
            <Button component={RouterLink} to="/login" variant="outlined" size="small">
              {t('actions.login')}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {t('appName')}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
