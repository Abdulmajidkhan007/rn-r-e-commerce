import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { loginSchema, type LoginValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';

export default function LoginPage(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await login(values);
    if (ok) {
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    }
  });

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} noValidate>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('auth.login.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.login.subtitle')}
        </Typography>
      </Stack>

      {serverError && <Alert severity="error">{tk(serverError)}</Alert>}

      <TextField
        label={t('auth.labels.email')}
        type="email"
        autoComplete="email"
        fullWidth
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email ? tk(errors.email.message ?? '') : ' '}
      />
      <TextField
        label={t('auth.labels.password')}
        type="password"
        autoComplete="current-password"
        fullWidth
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password ? tk(errors.password.message ?? '') : ' '}
      />

      <Link
        component={RouterLink}
        to="/forgot-password"
        variant="body2"
        sx={{ alignSelf: 'flex-end' }}
      >
        {t('auth.actions.forgotPassword')}
      </Link>

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
        {t('auth.actions.login')}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {t('auth.actions.noAccount')}{' '}
        <Link component={RouterLink} to="/register">
          {t('auth.actions.register')}
        </Link>
      </Typography>
    </Stack>
  );
}
