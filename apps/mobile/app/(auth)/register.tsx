import { ScrollView, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Button, HelperText, Text } from 'react-native-paper';
import { registerSchema, type RegisterValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

export default function RegisterScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const router = useRouter();
  const { register } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await register(values);
    if (ok) router.replace('/');
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 8 }}>
      <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
        {t('auth.register.title')}
      </Text>
      <Text variant="bodyMedium" style={{ opacity: 0.7, marginBottom: 8 }}>
        {t('auth.register.subtitle')}
      </Text>

      {serverError ? (
        <HelperText type="error" visible>
          {tk(serverError)}
        </HelperText>
      ) : null}

      <FormTextInput
        control={control}
        name="displayName"
        label={t('auth.labels.displayName')}
        autoComplete="name"
        error={errors.displayName ? tk(errors.displayName.message ?? '') : undefined}
      />
      <FormTextInput
        control={control}
        name="email"
        label={t('auth.labels.email')}
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email ? tk(errors.email.message ?? '') : undefined}
      />
      <FormTextInput
        control={control}
        name="password"
        label={t('auth.labels.password')}
        secureTextEntry
        autoComplete="new-password"
        error={errors.password ? tk(errors.password.message ?? '') : undefined}
      />
      <FormTextInput
        control={control}
        name="confirmPassword"
        label={t('auth.labels.confirmPassword')}
        secureTextEntry
        autoComplete="new-password"
        error={errors.confirmPassword ? tk(errors.confirmPassword.message ?? '') : undefined}
      />

      <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
        {t('auth.actions.createAccount')}
      </Button>

      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Link href="/(auth)/login">
          <Text>
            {t('auth.actions.haveAccount')} {t('auth.actions.login')}
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}
