import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { contactFormSchema, CONTACT_LIMITS, type ContactFormValues } from '@kidswear/core';
import { useAuth } from '@kidswear/auth';
import { useSendContactMessage } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Card } from '@/components';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const EMPTY: ContactFormValues = { name: '', phone: '', email: '', message: '' };

export default function ContactPage(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  useDocumentTitle(t('contact.title'));
  const { user } = useAuth();
  const send = useSendContactMessage();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { ...EMPTY, name: user?.displayName ?? '', email: user?.email ?? '' },
  });

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

  const err = (key: keyof ContactFormValues): string | undefined =>
    errors[key]?.message ? tk(errors[key].message) : undefined;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            {t('contact.title')}
          </Typography>
          <Typography color="text.secondary">{t('contact.subtitle')}</Typography>
        </Stack>

        <Card>
          {sent ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Alert severity="success" sx={{ width: '100%' }}>
                {t('contact.sent')}
              </Alert>
              <Button onClick={() => setSent(false)}>{t('contact.sendAnother')}</Button>
            </Stack>
          ) : (
            <Stack component="form" spacing={2} noValidate onSubmit={(e) => void onSubmit(e)}>
              {send.isError && <Alert severity="error">{t('contact.failed')}</Alert>}
              <TextField
                label={t('contact.name')}
                autoComplete="name"
                {...register('name')}
                error={!!errors.name}
                helperText={err('name')}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label={t('contact.phone')}
                  placeholder="+998 90 123 45 67"
                  autoComplete="tel"
                  {...register('phone')}
                  error={!!errors.phone}
                  helperText={err('phone')}
                />
                <TextField
                  fullWidth
                  label={t('contact.email')}
                  autoComplete="email"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={err('email') ?? t('contact.optional')}
                />
              </Stack>
              <TextField
                label={t('contact.message')}
                multiline
                minRows={5}
                slotProps={{ htmlInput: { maxLength: CONTACT_LIMITS.message } }}
                {...register('message')}
                error={!!errors.message}
                helperText={err('message')}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={send.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                {send.isPending ? t('contact.sending') : t('contact.send')}
              </Button>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
