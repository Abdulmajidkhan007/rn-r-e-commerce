import { useState } from 'react';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { REVIEW_TEXT_MAX, type ReviewFormValues } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { StarPicker } from './StarPicker';

export interface ReviewFormDialogProps {
  productName: string;
  /** Present when editing. */
  initial?: ReviewFormValues;
  pending: boolean;
  /** i18n key of the last failure. */
  errorKey: string | null;
  onSubmit: (values: ReviewFormValues) => void;
  onDismiss: () => void;
}

/** Star picker + optional text. Mounted only while open, so fields start fresh. */
export function ReviewFormDialog({
  productName,
  initial,
  pending,
  errorKey,
  onSubmit,
  onDismiss,
}: ReviewFormDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [text, setText] = useState(initial?.text ?? '');
  const [touched, setTouched] = useState(false);

  const submit = (): void => {
    setTouched(true);
    if (rating === null) return;
    onSubmit({ rating, text: text.trim() });
  };

  return (
    <Portal>
      <Dialog visible onDismiss={pending ? undefined : onDismiss}>
        <Dialog.Title>{initial ? t('reviews.edit') : t('reviews.write')}</Dialog.Title>
        <Dialog.Content style={{ gap: 8 }}>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            {productName}
          </Text>
          <Text variant="titleSmall">{t('reviews.yourRating')}</Text>
          <StarPicker value={rating} onChange={setRating} />
          <HelperText type="error" visible={touched && rating === null}>
            {t('reviews.pickRating')}
          </HelperText>
          <TextInput
            mode="outlined"
            label={t('reviews.text')}
            value={text}
            onChangeText={(value) => setText(value.slice(0, REVIEW_TEXT_MAX))}
            multiline
            numberOfLines={4}
            maxLength={REVIEW_TEXT_MAX}
          />
          <HelperText type="info" visible>
            {t('reviews.textHelper', { count: text.length, max: REVIEW_TEXT_MAX })}
          </HelperText>
          {errorKey ? (
            <HelperText type="error" visible>
              {tk(errorKey)}
            </HelperText>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={pending}>
            {t('reviews.cancel')}
          </Button>
          <Button mode="contained" onPress={submit} disabled={pending} loading={pending}>
            {initial ? t('reviews.save') : t('reviews.submit')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
