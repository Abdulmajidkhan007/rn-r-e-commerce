import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { profileSchema, type ProfileValues, useProfileActions, useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { Card } from '@/components';

export function ProfileForm(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { user } = useAuth();
  const { updateProfile, saving, error } = useProfileActions();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName ?? '', phone: user?.phone ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    const ok = await updateProfile(values);
    if (ok) setSaved(true);
  });

  return (
    <Card>
      <Stack component="form" onSubmit={onSubmit} spacing={2} noValidate>
        <Typography variant="h6">{t('profile.editProfile')}</Typography>

        {saved && <Alert severity="success">{t('profile.saved')}</Alert>}
        {error && <Alert severity="error">{tk(error)}</Alert>}

        <TextField
          label={t('profile.displayName')}
          fullWidth
          {...register('displayName')}
          error={!!errors.displayName}
          helperText={errors.displayName ? tk(errors.displayName.message ?? '') : ' '}
        />
        <TextField
          label={t('profile.phone')}
          fullWidth
          placeholder="+998901234567"
          {...register('phone')}
          error={!!errors.phone}
          helperText={errors.phone ? tk(errors.phone.message ?? '') : ' '}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('profile.save')}
        </Button>
      </Stack>
    </Card>
  );
}
