import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button, HelperText, IconButton } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import { pickImage, processToWebp } from '@/lib/image';

export interface ImageUploadFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Uploads the processed WebP blob and returns its download URL. */
  upload: (blob: Blob, index: number) => Promise<string>;
  onRemove?: (url: string, index: number) => Promise<void> | void;
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
    const uri = await pickImage();
    if (!uri) return;
    setBusy(true);
    try {
      const blob = await processToWebp(uri);
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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {value.map((url, i) => (
          <View key={url}>
            <Image source={{ uri: url }} style={{ width: 88, height: 110, borderRadius: 8 }} />
            <IconButton
              icon="close"
              size={16}
              mode="contained"
              onPress={() => void handleRemove(i)}
              style={{ position: 'absolute', top: -6, right: -6, margin: 0 }}
            />
          </View>
        ))}
      </View>

      <Button
        mode="outlined"
        icon="image-plus"
        loading={busy}
        disabled={busy || atMax}
        onPress={() => void handleAdd()}
      >
        {busy ? t('admin.uploading') : t('admin.addImage')}
      </Button>

      {error ? (
        <HelperText type="error" visible>
          {t('admin.uploadError')}
        </HelperText>
      ) : null}
    </View>
  );
}
