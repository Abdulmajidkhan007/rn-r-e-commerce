import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dialog, Portal } from 'react-native-paper';
import type { Address } from '@kidswear/core';
import { addressSchema, type AddressFormValues } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface AddressDialogProps {
  visible: boolean;
  address?: Address | null;
  saving: boolean;
  onDismiss: () => void;
  onSubmit: (values: AddressFormValues) => Promise<boolean>;
}

const EMPTY: AddressFormValues = {
  fullName: '',
  phone: '',
  region: '',
  district: '',
  street: '',
  note: '',
};

export function AddressDialog({
  visible,
  address,
  saving,
  onDismiss,
  onSubmit,
}: AddressDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (visible) {
      reset(
        address
          ? {
              fullName: address.fullName,
              phone: address.phone,
              region: address.region,
              district: address.district,
              street: address.street,
              note: address.note ?? '',
            }
          : EMPTY,
      );
    }
  }, [visible, address, reset]);

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(values);
    if (ok) onDismiss();
  });

  const err = (key: keyof AddressFormValues): string | undefined =>
    errors[key] ? tk(errors[key]?.message ?? '') : undefined;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>
          {address ? t('addresses.editAddress') : t('addresses.addAddress')}
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            <FormTextInput
              control={control}
              name="fullName"
              label={t('addresses.fullName')}
              error={err('fullName')}
            />
            <FormTextInput
              control={control}
              name="phone"
              label={t('addresses.phone')}
              keyboardType="phone-pad"
              error={err('phone')}
            />
            <FormTextInput
              control={control}
              name="region"
              label={t('addresses.region')}
              error={err('region')}
            />
            <FormTextInput
              control={control}
              name="district"
              label={t('addresses.district')}
              error={err('district')}
            />
            <FormTextInput
              control={control}
              name="street"
              label={t('addresses.street')}
              error={err('street')}
            />
            <FormTextInput control={control} name="note" label={t('addresses.note')} />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('actions.cancel')}</Button>
          <Button mode="contained" onPress={submit} loading={saving} disabled={saving}>
            {t('profile.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
