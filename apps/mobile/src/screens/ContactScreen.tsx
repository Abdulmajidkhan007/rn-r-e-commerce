import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, HelperText, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contactFormSchema, CONTACT_LIMITS, type ContactFormValues } from '@kidswear/core';
import { useAuth } from '@kidswear/auth';
import { useSendContactMessage } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

const EMPTY: ContactFormValues = { name: '', phone: '', email: '', message: '' };

export function ContactScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const send = useSendContactMessage();
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { ...EMPTY, name: user?.displayName ?? '', email: user?.email ?? '' },
  });

  const err = (key: keyof ContactFormValues): string | undefined =>
    errors[key]?.message ? tk(errors[key].message) : undefined;

  const onSubmit = handleSubmit(async (values) => {
    await send.mutateAsync({
      name: values.name,
      phone: values.phone,
      message: values.message,
      ...(values.email ? { email: values.email } : {}),
      ...(user ? { userId: user.uid } : {}),
    });
    reset(EMPTY);
    setSent(true);
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
    >
      <Text variant="bodyMedium" style={{ opacity: 0.75 }}>
        {t('contact.subtitle')}
      </Text>
      <Card mode="outlined">
        <Card.Content style={{ gap: 8 }}>
          {sent ? (
            <>
              <Text variant="titleMedium">{t('contact.sent')}</Text>
              <Button onPress={() => setSent(false)}>{t('contact.sendAnother')}</Button>
            </>
          ) : (
            <>
              {send.isError ? (
                <HelperText type="error" visible>
                  {t('contact.failed')}
                </HelperText>
              ) : null}
              <FormTextInput
                control={control}
                name="name"
                label={t('contact.name')}
                error={err('name')}
              />
              <FormTextInput
                control={control}
                name="phone"
                label={t('contact.phone')}
                keyboardType="phone-pad"
                error={err('phone')}
              />
              <FormTextInput
                control={control}
                name="email"
                label={`${t('contact.email')} (${t('contact.optional')})`}
                keyboardType="email-address"
                autoCapitalize="none"
                error={err('email')}
              />
              <FormTextInput
                control={control}
                name="message"
                label={t('contact.message')}
                multiline
                numberOfLines={5}
                maxLength={CONTACT_LIMITS.message}
                error={err('message')}
              />
              <Button
                mode="contained"
                loading={send.isPending}
                disabled={send.isPending}
                onPress={() => void onSubmit()}
              >
                {t('contact.send')}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
