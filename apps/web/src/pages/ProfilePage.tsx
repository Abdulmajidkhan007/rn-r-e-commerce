import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAuth, useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { Avatar } from '@/components';
import { AddressSection } from '@/components/profile/AddressSection';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import NotificationsSection from '@/components/profile/NotificationsSection';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ProfilePage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.profile.title'));
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { logout } = useAuthActions();

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container disableGutters maxWidth={false} sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 4 } }}>
      <Stack spacing={3} sx={{ py: { xs: 3, md: 5 } }}>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
          {t('auth.profile.title')}
        </Typography>

        <ProfileSection title={t('auth.profile.account', { defaultValue: 'Hisob' })}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar src={user?.avatarUrl} sx={{ width: 56, height: 56 }}>
                {initial}
              </Avatar>
              <Stack sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap>
                  {user?.displayName || '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
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

            <Stack direction="row" spacing={2}>
              <Button component={RouterLink} to="/orders" variant="outlined">
                {t('orders.myOrders')}
              </Button>
              <Button variant="outlined" color="error" onClick={() => void handleLogout()}>
                {t('auth.actions.logout')}
              </Button>
            </Stack>
          </Stack>
        </ProfileSection>

        <ProfileSection title={t('avatar.changePhoto', { defaultValue: 'Profil rasmi' })}>
          <AvatarUploader />
        </ProfileSection>

        {/*
          ProfileForm / AddressSection / NotificationsSection already render their own
          outlined Card + heading internally (untouched, reused as-is). Wrapping them in
          another ProfileSection Card would nest two borders and duplicate the title text,
          so they're stacked directly rather than passed through the wrapper.
        */}
        <ProfileForm />

        <AddressSection />

        <NotificationsSection />

        <ProfileSection title={t('security.security')}>
          <Typography variant="body2" color="text.secondary">
            {t('security.webNote')}
          </Typography>
        </ProfileSection>
      </Stack>
    </Container>
  );
}
