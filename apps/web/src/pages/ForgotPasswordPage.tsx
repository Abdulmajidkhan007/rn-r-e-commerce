import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { forgotSchema, type ForgotValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';

export default function ForgotPasswordPage(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { resetPassword } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    const ok = await resetPassword(email);
    if (ok) setSent(true);
  });

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} noValidate>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('auth.forgot.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.forgot.subtitle')}
        </Typography>
      </Stack>

      {sent && <Alert severity="success">{t('auth.messages.resetSent')}</Alert>}
      {serverError && !sent && <Alert severity="error">{tk(serverError)}</Alert>}

      <TextField
        label={t('auth.labels.email')}
        type="email"
        autoComplete="email"
        fullWidth
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email ? tk(errors.email.message ?? '') : ' '}
      />

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
        {t('auth.actions.sendResetLink')}
      </Button>

      <Link component={RouterLink} to="/login" variant="body2" sx={{ textAlign: 'center' }}>
        {t('auth.actions.backToLogin')}
      </Link>
    </Stack>
  );
}
