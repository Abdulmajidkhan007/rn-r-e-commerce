import React from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useTranslation } from '@kidswear/i18n';
import { ThemeToggle } from '@/components';
import { tokens } from '@kidswear/theme';

const DRAWER_WIDTH = 240;

const ITEMS = [
  { to: '/admin', labelKey: 'admin.dashboard', icon: <DashboardIcon /> },
  { to: '/admin/products', labelKey: 'admin.products', icon: <Inventory2Icon /> },
  { to: '/admin/categories', labelKey: 'admin.categories', icon: <CategoryIcon /> },
  { to: '/admin/orders', labelKey: 'admin.orders', icon: <ReceiptLongIcon /> },
] as const;

/** Admin layout: persistent sidebar + topbar on desktop; BottomNavigation on mobile. */
export function AdminLayout(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();

  // Match active item: exact for /admin, prefix for sub-routes.
  const activeIndex = ITEMS.findIndex((item) =>
    item.to === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(item.to),
  );

  const chromeAppBarSx = {
    backgroundColor: alpha(theme.palette.background.paper, 0.85),
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['background-color', 'border-color'], {
      duration: tokens.durations.normal,
      easing: tokens.easings.standard,
    }),
  } as const;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ ...chromeAppBarSx, zIndex: theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            {t('appName')}
            <Typography
              component="span"
              variant="body2"
              sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
            >
              · {t('nav.admin')}
            </Typography>
          </Typography>
          <ThemeToggle />
        </Toolbar>
      </AppBar>

      {/* Persistent sidebar — desktop only */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', pt: 1 }}>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '0.1em',
                display: 'block',
                mb: 0.5,
              }}
            >
              {t('nav.admin')}
            </Typography>
            <List disablePadding>
              {ITEMS.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <ListItemButton
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.5,
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.08)
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.action.hover, 1),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{ color: isActive ? 'primary.main' : 'inherit', minWidth: 40 }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.labelKey)}
                      slotProps={{
                        primary: {
                          sx: {
                            fontWeight: isActive ? 700 : 400,
                            color: isActive ? 'primary.main' : 'text.primary',
                          },
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pb: isDesktop ? 3 : 10,
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* BottomNavigation — mobile only */}
      {!isDesktop && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
          }}
          elevation={3}
        >
          <BottomNavigation value={activeIndex === -1 ? 0 : activeIndex} showLabels>
            {ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.to}
                label={t(item.labelKey)}
                icon={item.icon}
                component={RouterLink}
                to={item.to}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
