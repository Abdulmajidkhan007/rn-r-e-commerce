import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Button, HelperText, Text } from 'react-native-paper';
import { forgotSchema, type ForgotValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

export default function ForgotPasswordScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { resetPassword } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);
  const [sent, setSent] = useState(false);

  const {
    control,
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
    <ScrollView contentContainerStyle={{ padding: 24, gap: 8 }}>
      <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
        {t('auth.forgot.title')}
      </Text>
      <Text variant="bodyMedium" style={{ opacity: 0.7, marginBottom: 8 }}>
        {t('auth.forgot.subtitle')}
      </Text>

      {sent ? (
        <HelperText type="info" visible>
          {t('auth.messages.resetSent')}
        </HelperText>
      ) : null}
      {serverError && !sent ? (
        <HelperText type="error" visible>
          {tk(serverError)}
        </HelperText>
      ) : null}

      <FormTextInput
        control={control}
        name="email"
        label={t('auth.labels.email')}
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email ? tk(errors.email.message ?? '') : undefined}
      />

      <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
        {t('auth.actions.sendResetLink')}
      </Button>

      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Link href="/(auth)/login">
          <Text>{t('auth.actions.backToLogin')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
