import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import LockOutlineIcon from '@mui/icons-material/LockOutlined';
import { registerSchema, type RegisterValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function RegisterPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.register.title'));
  const tk = useTranslateKey();
  const navigate = useNavigate();
  const { register: registerUser } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await registerUser(values);
    if (ok) navigate('/', { replace: true });
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, md: 6 },
          py: 4,
        }}
      >
        <Stack
          component="form"
          onSubmit={onSubmit}
          spacing={2}
          noValidate
          sx={{ width: '100%', maxWidth: 480 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              KidsWear
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {t('auth.register.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.register.subtitle')}
            </Typography>
          </Stack>

          {serverError && <Alert severity="error">{tk(serverError)}</Alert>}

          <GoogleSignInButton mode="register" />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('auth.orContinueWith')}
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <TextField
            label={t('auth.labels.displayName')}
            autoComplete="name"
            fullWidth
            {...register('displayName')}
            error={!!errors.displayName}
            helperText={errors.displayName ? tk(errors.displayName.message ?? '') : ' '}
          />
          <TextField
            label={t('auth.labels.email')}
            type="email"
            autoComplete="email"
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email ? tk(errors.email.message ?? '') : ' '}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label={t('auth.labels.password')}
            type="password"
            autoComplete="new-password"
            fullWidth
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password ? tk(errors.password.message ?? '') : ' '}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label={t('auth.labels.confirmPassword')}
            type="password"
            autoComplete="new-password"
            fullWidth
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword ? tk(errors.confirmPassword.message ?? '') : ' '}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
            {t('auth.actions.createAccount')}
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {t('auth.actions.haveAccount')}{' '}
            <Link component={RouterLink} to="/login">
              {t('auth.actions.login')}
            </Link>
          </Typography>
        </Stack>
      </Box>

      {/* Right panel — desktop only */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          bgcolor: 'primary.main',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          px: 6,
        }}
      >
        <Typography variant="h3" sx={{ color: 'white', fontWeight: 800 }}>
          KidsWear
        </Typography>
        <Typography variant="h6" sx={{ color: 'white', opacity: 0.85, textAlign: 'center' }}>
          {t('branding.tagline')}
        </Typography>
      </Box>
    </Box>
  );
}
