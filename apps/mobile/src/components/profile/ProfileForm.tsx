import { useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, HelperText, Text } from 'react-native-paper';
import { profileSchema, type ProfileValues, useAuth, useProfileActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

export function ProfileForm(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { user } = useAuth();
  const { updateProfile, saving, error } = useProfileActions();
  const [saved, setSaved] = useState(false);

  const {
    control,
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
    <Card mode="outlined">
      <Card.Content style={{ gap: 4 }}>
        <Text variant="titleMedium">{t('profile.editProfile')}</Text>

        {saved ? (
          <HelperText type="info" visible>
            {t('profile.saved')}
          </HelperText>
        ) : null}
        {error ? (
          <HelperText type="error" visible>
            {tk(error)}
          </HelperText>
        ) : null}

        <FormTextInput
          control={control}
          name="displayName"
          label={t('profile.displayName')}
          autoComplete="name"
          error={errors.displayName ? tk(errors.displayName.message ?? '') : undefined}
        />
        <FormTextInput
          control={control}
          name="phone"
          label={t('profile.phone')}
          keyboardType="phone-pad"
          error={errors.phone ? tk(errors.phone.message ?? '') : undefined}
        />

        <View style={{ alignItems: 'flex-start' }}>
          <Button mode="contained" onPress={onSubmit} loading={saving} disabled={saving}>
            {t('profile.save')}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
