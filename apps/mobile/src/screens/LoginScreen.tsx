import { Pressable, ScrollView, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { Button, Divider, HelperText, Text } from 'react-native-paper';
import { loginSchema, type LoginValues, useAuthActions } from '@kidswear/auth';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export function LoginScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const navigation = useNavigation();
  const { login } = useAuthActions();
  const serverError = useAppSelector((s) => s.auth.error);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await login(values);
    if (ok) navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
          {t('auth.login.title')}
        </Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
          {t('auth.login.subtitle')}
        </Text>
      </View>

      {serverError ? (
        <HelperText type="error" visible>
          {tk(serverError)}
        </HelperText>
      ) : null}

      <GoogleSignInButton mode="login" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Divider style={{ flex: 1 }} />
        <Text variant="bodySmall" style={{ opacity: 0.6 }}>
          {t('auth.orContinueWith')}
        </Text>
        <Divider style={{ flex: 1 }} />
      </View>

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
        autoComplete="password"
        error={errors.password ? tk(errors.password.message ?? '') : undefined}
      />

      <Button mode="contained" onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
        {t('auth.actions.login')}
      </Button>

      <View style={{ marginTop: 8, gap: 4, alignItems: 'center' }}>
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={{ opacity: 0.8 }}>{t('auth.actions.forgotPassword')}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text>
            {t('auth.actions.noAccount')} {t('auth.actions.register')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
