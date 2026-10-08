import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAuth } from '@kidswear/auth';
import { useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { Avatar } from '@/components';

export function AccountMenu(): React.ReactElement {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleLogout = async (): Promise<void> => {
    handleClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const initial = user?.displayName?.[0] ?? user?.email?.[0] ?? '?';

  return (
    <>
      <IconButton onClick={handleOpen} aria-label={t('auth.profile.title')} size="small">
        <Avatar src={user?.avatarUrl} sx={{ width: 32, height: 32, fontSize: 14 }}>
          {initial}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 200 } } }}
      >
        {/* Header row */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {user?.displayName ?? ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {user?.email ?? ''}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={RouterLink} to="/profile" onClick={handleClose}>
          {t('auth.profile.title')}
        </MenuItem>
        <MenuItem component={RouterLink} to="/orders" onClick={handleClose}>
          {t('orders.myOrders')}
        </MenuItem>
        {isAdmin && (
          <MenuItem component={RouterLink} to="/admin" onClick={handleClose}>
            {t('nav.admin')}
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            void handleLogout();
          }}
        >
          {t('auth.actions.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}
