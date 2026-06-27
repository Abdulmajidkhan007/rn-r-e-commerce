import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import {
  deleteStorageObject,
  storagePaths,
  uploadAvatar,
} from '@kidswear/firebase';
import { useAuth, useProfileActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { Avatar } from '@/components';
import { pickImageFile, processToWebp } from '@/lib/image';

export function AvatarUploader(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { updateAvatar } = useProfileActions();
  const [busy, setBusy] = useState(false);

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  const change = async (): Promise<void> => {
    if (!user) return;
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    try {
      const blob = await processToWebp(file, { maxW: 512, maxH: 512 });
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
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar src={user?.avatarUrl} sx={{ width: 64, height: 64 }}>
        {initial}
      </Avatar>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
          onClick={() => void change()}
        >
          {t('avatar.changePhoto')}
        </Button>
        {user?.avatarUrl && (
          <Button size="small" color="error" disabled={busy} onClick={() => void remove()}>
            {t('avatar.removePhoto')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
