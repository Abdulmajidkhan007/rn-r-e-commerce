import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Button } from 'react-native-paper';
import { deleteStorageObject, storagePaths, uploadAvatar } from '@kidswear/firebase';
import { useAuth, useProfileActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { pickImage, processToWebp } from '@/lib/image';

export function AvatarUploader(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { updateAvatar } = useProfileActions();
  const [busy, setBusy] = useState(false);

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  const change = async (): Promise<void> => {
    if (!user) return;
    const uri = await pickImage();
    if (!uri) return;
    setBusy(true);
    try {
      const blob = await processToWebp(uri, { maxW: 512 });
      const url = await uploadAvatar(user.uid, blob);
      await updateAvatar(url);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!user) return;
    setBusy(true);
    try {
      await deleteStorageObject(storagePaths.avatar(user.uid)).catch(() => undefined);
      await updateAvatar(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {user?.avatarUrl ? (
        <Avatar.Image size={64} source={{ uri: user.avatarUrl }} />
      ) : (
        <Avatar.Text size={64} label={initial} />
      )}
      <View style={{ gap: 6 }}>
        <Button compact mode="outlined" loading={busy} disabled={busy} onPress={() => void change()}>
          {t('avatar.changePhoto')}
        </Button>
        {user?.avatarUrl ? (
          <Button compact textColor="red" disabled={busy} onPress={() => void remove()}>
            {t('avatar.removePhoto')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}
