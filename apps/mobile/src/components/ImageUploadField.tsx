import { useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, IconButton } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import { pickImage } from '@/lib/image';
import { ProductImage } from './ProductImage';

export interface ImageUploadFieldProps<TEncoded> {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Persists the encoded image and returns the string stored in `value`. */
  upload: (encoded: TEncoded, index: number) => Promise<string>;
  /** Encodes (resizes/compresses) the picked image uri before upload. */
  encode: (uri: string) => Promise<TEncoded>;
  onRemove?: (url: string, index: number) => Promise<void> | void;
  single?: boolean;
  max?: number;
}

export function ImageUploadField<TEncoded>({
  value,
  onChange,
  upload,
  encode,
  onRemove,
  single = false,
  max = 6,
}: ImageUploadFieldProps<TEncoded>): React.ReactElement {
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
      const encoded = await encode(uri);
      const index = single ? 0 : value.length;
      const url = await upload(encoded, index);
      onChange(single ? [url] : [...value, url]);
    } catch (err) {
      console.warn('[image] upload failed:', err);
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
            <ProductImage src={url} style={{ width: 88, height: 110, borderRadius: 8 }} />
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
