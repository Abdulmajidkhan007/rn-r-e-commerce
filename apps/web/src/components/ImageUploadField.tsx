import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@kidswear/i18n';
import { pickImageFile, processToWebp } from '@/lib/image';

export interface ImageUploadFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Uploads the processed WebP blob and returns its download URL. */
  upload: (blob: Blob, index: number) => Promise<string>;
  /** Optional storage cleanup when an image is removed. */
  onRemove?: (url: string, index: number) => Promise<void> | void;
  /** Single-image mode (avatar) replaces; otherwise appends up to `max`. */
  single?: boolean;
  max?: number;
}

export function ImageUploadField({
  value,
  onChange,
  upload,
  onRemove,
  single = false,
  max = 6,
}: ImageUploadFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const atMax = !single && value.length >= max;

  const handleAdd = async (): Promise<void> => {
    setError(false);
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    try {
      const blob = await processToWebp(file);
      const index = single ? 0 : value.length;
      const url = await upload(blob, index);
      onChange(single ? [url] : [...value, url]);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (i: number): Promise<void> => {
    const url = value[i];
    if (url) await onRemove?.(url, i);
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {value.map((url, i) => (
          <Box key={url} sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={url}
              alt=""
              sx={{ width: 88, height: 110, objectFit: 'cover', borderRadius: 1 }}
            />
            <IconButton
              size="small"
              onClick={() => void handleRemove(i)}
              sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>

      <Button
        variant="outlined"
        startIcon={busy ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
        disabled={busy || atMax}
        onClick={() => void handleAdd()}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? t('admin.uploading') : t('admin.addImage')}
      </Button>

      {error && (
        <Typography variant="caption" color="error">
          {t('admin.uploadError')}
        </Typography>
      )}
    </Stack>
  );
}
