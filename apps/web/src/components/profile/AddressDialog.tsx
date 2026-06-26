import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import type { Address } from '@kidswear/core';
import { addressSchema, type AddressFormValues } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface AddressDialogProps {
  open: boolean;
  /** When set, the dialog edits this address; otherwise it adds a new one. */
  address?: Address | null;
  saving: boolean;
  onClose: () => void;
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
  open,
  address,
  saving,
  onClose,
  onSubmit,
}: AddressDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
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
  }, [open, address, reset]);

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(values);
    if (ok) onClose();
  });

  const fieldError = (key: keyof AddressFormValues): string =>
    errors[key] ? tk(errors[key]?.message ?? '') : ' ';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{address ? t('addresses.editAddress') : t('addresses.addAddress')}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="address-form"
          onSubmit={submit}
          spacing={2}
          sx={{ pt: 1 }}
          noValidate
        >
          <TextField
            label={t('addresses.fullName')}
            fullWidth
            {...register('fullName')}
            error={!!errors.fullName}
            helperText={fieldError('fullName')}
          />
          <TextField
            label={t('addresses.phone')}
            fullWidth
            placeholder="+998901234567"
            {...register('phone')}
            error={!!errors.phone}
            helperText={fieldError('phone')}
          />
          <TextField
            label={t('addresses.region')}
            fullWidth
            {...register('region')}
            error={!!errors.region}
            helperText={fieldError('region')}
          />
          <TextField
            label={t('addresses.district')}
            fullWidth
            {...register('district')}
            error={!!errors.district}
            helperText={fieldError('district')}
          />
          <TextField
            label={t('addresses.street')}
            fullWidth
            {...register('street')}
            error={!!errors.street}
            helperText={fieldError('street')}
          />
          <TextField label={t('addresses.note')} fullWidth {...register('note')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('actions.cancel')}</Button>
        <Button type="submit" form="address-form" variant="contained" disabled={saving}>
          {t('profile.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
