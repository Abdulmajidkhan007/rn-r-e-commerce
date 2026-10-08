import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '@kidswear/auth';
import { useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { LanguageSwitcher, ThemeToggle } from '@/components';
import { tokens } from '@kidswear/theme';

const NAV_ITEMS = [
  { to: '/', key: 'nav.home' },
  { to: '/catalog', key: 'nav.catalog' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/contact', key: 'nav.contact' },
] as const;

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({
  open,
  onClose,
}: MobileNavDrawerProps): React.ReactElement {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '85vw', sm: 320 } } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            {t('appName')}
          </Typography>
          <IconButton onClick={onClose} aria-label="close menu" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Nav links */}
        <List sx={{ flexGrow: 1, py: 1 }}>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              onClick={onClose}
              sx={{ py: 1.5 }}
            >
              <ListItemText
                primary={t(item.key)}
                slotProps={{
                  primary: { sx: { fontSize: tokens.fontSizes.lg, fontWeight: 500 } },
                }}
              />
            </ListItemButton>
          ))}
          <ListItemButton
            component={RouterLink}
            to="/privacy"
            onClick={onClose}
            sx={{ py: 1.5 }}
          >
            <ListItemText
              primary={t('footer.privacy')}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: tokens.fontSizes.lg,
                    fontWeight: 500,
                    color: 'text.secondary',
                  },
                },
              }}
            />
          </ListItemButton>
          <ListItemButton
            component={RouterLink}
            to="/terms"
            onClick={onClose}
            sx={{ py: 1.5 }}
          >
            <ListItemText
              primary={t('footer.terms')}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: tokens.fontSizes.lg,
                    fontWeight: 500,
                    color: 'text.secondary',
                  },
                },
              }}
            />
          </ListItemButton>
        </List>

        <Divider />

        {/* Auth section */}
        <Box sx={{ px: 2, py: 2 }}>
          {isAuthenticated ? (
            <Stack spacing={1}>
              <ListItemButton
                component={RouterLink}
                to="/profile"
                onClick={onClose}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                <ListItemText
                  primary={t('auth.profile.title')}
                  slotProps={{
                    primary: { sx: { fontSize: tokens.fontSizes.lg } },
                  }}
                />
              </ListItemButton>
              <ListItemButton
                component={RouterLink}
                to="/orders"
                onClick={onClose}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                <ListItemText
                  primary={t('orders.myOrders')}
                  slotProps={{
                    primary: { sx: { fontSize: tokens.fontSizes.lg } },
                  }}
                />
              </ListItemButton>
              {isAdmin && (
                <ListItemButton
                  component={RouterLink}
                  to="/admin"
                  onClick={onClose}
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  <ListItemText
                    primary={t('nav.admin')}
                    slotProps={{
                      primary: { sx: { fontSize: tokens.fontSizes.lg } },
                    }}
                  />
                </ListItemButton>
              )}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  void handleLogout();
                }}
                sx={{ mt: 1 }}
              >
                {t('auth.actions.logout')}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                component={RouterLink}
                to="/login"
                onClick={onClose}
              >
                {t('auth.login.title')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                component={RouterLink}
                to="/register"
                onClick={onClose}
              >
                {t('auth.actions.register')}
              </Button>
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Sticky footer: LanguageSwitcher + ThemeToggle */}
        <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <LanguageSwitcher />
          </Box>
          <ThemeToggle />
        </Box>
      </Box>
    </Drawer>
  );
}
