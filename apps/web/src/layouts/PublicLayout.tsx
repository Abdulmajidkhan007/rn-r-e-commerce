import React, { useState, useEffect } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { useAppSelector } from '@kidswear/store';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import {
  Badge,
  LanguageSwitcher,
  ThemeToggle,
  AccountMenu,
  MobileNavDrawer,
} from '@/components';

const NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/catalog', key: 'nav.catalog' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/contact', key: 'nav.contact' },
] as const;

/** Public-facing layout: header with nav, language, theme, cart; and a footer. */
export function PublicLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handler = (): void => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
    };
  }, []);

  const transitionSx = theme.transitions.create(
    ['background-color', 'border-color', 'box-shadow'],
    {
      duration: tokens.durations.normal,
      easing: tokens.easings.standard,
    },
  );

  const appBarSx = scrolled
    ? {
        backgroundColor: alpha(theme.palette.background.paper, 0.85),
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        transition: transitionSx,
      }
    : {
        backgroundColor: 'transparent',
        borderBottom: '1px solid transparent',
        transition: transitionSx,
      };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={appBarSx}>
        <Toolbar sx={{ gap: 1 }}>
          {/* Brand wordmark */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1.1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'text.primary',
                lineHeight: 1,
              }}
            >
              {t('appName')}
            </Typography>
            {isDesktop && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1 }}
              >
                {t('branding.tagline')}
              </Typography>
            )}
          </Box>

          {isDesktop ? (
            <>
              {/* Desktop nav links */}
              <Stack direction="row" spacing={0} sx={{ flexGrow: 1, mx: 2 }}>
                {NAV.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== '/' && location.pathname.startsWith(item.to));
                  return (
                    <Button
                      key={item.to}
                      component={RouterLink}
                      to={item.to}
                      color="inherit"
                      sx={{
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 700 : 500,
                        borderBottom: isActive ? '2px solid' : '2px solid transparent',
                        borderColor: isActive ? 'primary.main' : 'transparent',
                        borderRadius: 0,
                        px: 1.5,
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          backgroundColor: 'transparent',
                        },
                        transition: theme.transitions.create(
                          ['color', 'transform', 'border-color'],
                          {
                            duration: tokens.durations.fast,
                            easing: tokens.easings.standard,
                          },
                        ),
                      }}
                    >
                      {t(item.key)}
                    </Button>
                  );
                })}
              </Stack>

              {/* Desktop right cluster */}
              <IconButton
                aria-label={t('actions.search')}
                color="inherit"
                size="small"
              >
                <SearchIcon />
              </IconButton>
              <LanguageSwitcher />
              <ThemeToggle />
              <IconButton
                component={RouterLink}
                to="/cart"
                aria-label={t('nav.cart')}
                color="inherit"
              >
                <Badge badgeContent={cartCount} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
              {isAuthenticated ? (
                <AccountMenu />
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="small"
                >
                  {t('auth.login.title')}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Mobile right cluster */}
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                component={RouterLink}
                to="/cart"
                aria-label={t('nav.cart')}
                color="inherit"
              >
                <Badge badgeContent={cartCount} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
              <IconButton
                aria-label="open menu"
                color="inherit"
                onClick={() => {
                  setDrawerOpen(true);
                }}
              >
                <MenuIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
        }}
      />

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.paper',
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: { xs: 4, md: 6 },
              py: { xs: 6, md: 8 },
            }}
          >
            {/* Column 1: Shop */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: 11,
                }}
              >
                Shop
              </Typography>
              <Stack spacing={1}>
                {NAV.map((item) => (
                  <Typography
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      textDecoration: 'none',
                      '&:hover': { color: 'primary.main' },
                      transition: theme.transitions.create('color', {
                        duration: tokens.durations.fast,
                      }),
                    }}
                  >
                    {t(item.key)}
                  </Typography>
                ))}
              </Stack>
            </Box>

            {/* Column 2: Account */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: 11,
                }}
              >
                Account
              </Typography>
              <Stack spacing={1}>
                {isAuthenticated ? (
                  <>
                    <Typography
                      component={RouterLink}
                      to="/profile"
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                        transition: theme.transitions.create('color', {
                          duration: tokens.durations.fast,
                        }),
                      }}
                    >
                      {t('auth.profile.title')}
                    </Typography>
                    <Typography
                      component={RouterLink}
                      to="/orders"
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                        transition: theme.transitions.create('color', {
                          duration: tokens.durations.fast,
                        }),
                      }}
                    >
                      {t('orders.myOrders')}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography
                      component={RouterLink}
                      to="/login"
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                        transition: theme.transitions.create('color', {
                          duration: tokens.durations.fast,
                        }),
                      }}
                    >
                      {t('auth.login.title')}
                    </Typography>
                    <Typography
                      component={RouterLink}
                      to="/register"
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                        transition: theme.transitions.create('color', {
                          duration: tokens.durations.fast,
                        }),
                      }}
                    >
                      {t('auth.actions.register')}
                    </Typography>
                  </>
                )}
              </Stack>
            </Box>

            {/* Column 3: Legal */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: 11,
                }}
              >
                Legal
              </Typography>
              <Stack spacing={1}>
                <Typography
                  component={RouterLink}
                  to="/privacy"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': { color: 'primary.main' },
                    transition: theme.transitions.create('color', {
                      duration: tokens.durations.fast,
                    }),
                  }}
                >
                  {t('footer.privacy')}
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/terms"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': { color: 'primary.main' },
                    transition: theme.transitions.create('color', {
                      duration: tokens.durations.fast,
                    }),
                  }}
                >
                  {t('footer.terms')}
                </Typography>
              </Stack>
            </Box>
          </Box>

          {/* Bottom row: brand + copyright */}
          <Box
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              py: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}
              >
                {t('appName')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('footer.tagline')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
