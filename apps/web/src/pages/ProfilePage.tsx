import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useAuth, useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { Avatar, Card } from '@/components';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { AddressSection } from '@/components/profile/AddressSection';

export default function ProfilePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { logout } = useAuthActions();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {t('auth.profile.title')}
      </Typography>

      <Card>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar>{initial}</Avatar>
            <Stack>
              <Typography variant="h6">{user?.displayName || '—'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('auth.profile.roleLabel')}:
            </Typography>
            <Chip
              size="small"
              color={isAdmin ? 'primary' : 'default'}
              label={isAdmin ? t('auth.roles.admin') : t('auth.roles.customer')}
            />
          </Stack>

          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('auth.actions.logout')}
          </Button>
        </Stack>
      </Card>

      <ProfileForm />

      <AddressSection />

      <Card>
        <Stack spacing={0.5}>
          <Typography variant="h6">{t('security.security')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('security.webNote')}
          </Typography>
        </Stack>
      </Card>
    </Stack>
  );
}
