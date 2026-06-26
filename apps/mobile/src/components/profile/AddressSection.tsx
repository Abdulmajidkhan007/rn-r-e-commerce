import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Dialog, HelperText, IconButton, Portal, Text } from 'react-native-paper';
import type { Address } from '@kidswear/core';
import { useAddressActions, useAuth, type AddressFormValues } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { AddressDialog } from './AddressDialog';

export function AddressSection(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const { user } = useAuth();
  const { addAddress, updateAddress, removeAddress, saving, error } = useAddressActions();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const addresses = user?.addresses ?? [];

  const openAdd = (): void => {
    setEditing(null);
    setDialogVisible(true);
  };
  const openEdit = (address: Address): void => {
    setEditing(address);
    setDialogVisible(true);
  };

  const handleSubmit = (values: AddressFormValues): Promise<boolean> =>
    editing ? updateAddress(editing.id, values) : addAddress(values);

  const confirmDelete = async (): Promise<void> => {
    if (pendingDelete) await removeAddress(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 8 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="titleMedium">{t('addresses.title')}</Text>
          <Button icon="plus" onPress={openAdd}>
            {t('addresses.addAddress')}
          </Button>
        </View>

        {error ? (
          <HelperText type="error" visible>
            {tk(error)}
          </HelperText>
        ) : null}

        {addresses.length === 0 ? (
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            {t('addresses.noAddresses')}
          </Text>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} mode="contained">
              <Card.Content>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSmall">{address.fullName}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                      {address.phone}
                    </Text>
                    <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                      {address.region}, {address.district}, {address.street}
                    </Text>
                    {address.note ? (
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        {address.note}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      accessibilityLabel={t('addresses.editAddress')}
                      onPress={() => openEdit(address)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      accessibilityLabel={t('addresses.deleteAddress')}
                      onPress={() => setPendingDelete(address)}
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </Card.Content>

      <AddressDialog
        visible={dialogVisible}
        address={editing}
        saving={saving}
        onDismiss={() => setDialogVisible(false)}
        onSubmit={handleSubmit}
      />

      <Portal>
        <Dialog visible={!!pendingDelete} onDismiss={() => setPendingDelete(null)}>
          <Dialog.Title>{t('addresses.confirmDelete')}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setPendingDelete(null)}>{t('actions.cancel')}</Button>
            <Button textColor="red" disabled={saving} onPress={confirmDelete}>
              {t('addresses.deleteAddress')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
}
