import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Address } from '@kidswear/core';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { Card } from '@/components';
import { AddressDialog } from './AddressDialog';

export function AddressSection(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { user } = useAuth();
  const { addAddress, updateAddress, removeAddress, saving, error } = useAddressActions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const addresses = user?.addresses ?? [];

  const openAdd = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (address: Address): void => {
    setEditing(address);
    setDialogOpen(true);
  };

  const handleSubmit = (values: AddressFormValues): Promise<boolean> =>
    editing ? updateAddress(editing.id, values) : addAddress(values);

  const confirmDelete = async (): Promise<void> => {
    if (pendingDelete) await removeAddress(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <Card>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{t('addresses.title')}</Typography>
          <Button startIcon={<AddIcon />} onClick={openAdd}>
            {t('addresses.addAddress')}
          </Button>
        </Stack>

        {error && <Alert severity="error">{tk(error)}</Alert>}

        {addresses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('addresses.noAddresses')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {addresses.map((address) => (
              <Card key={address.id}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2">{address.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {address.phone}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {address.region}, {address.district}, {address.street}
                    </Typography>
                    {address.note && (
                      <Typography variant="caption" color="text.secondary">
                        {address.note}
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row">
                    <IconButton
                      size="small"
                      aria-label={t('addresses.editAddress')}
                      onClick={() => openEdit(address)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={t('addresses.deleteAddress')}
                      onClick={() => setPendingDelete(address)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <AddressDialog
        open={dialogOpen}
        address={editing}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>{t('addresses.confirmDelete')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>{t('actions.cancel')}</Button>
          <Button color="error" disabled={saving} onClick={confirmDelete}>
            {t('addresses.deleteAddress')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
