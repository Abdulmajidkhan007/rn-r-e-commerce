import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { REVIEW_TEXT_MAX, type ReviewFormValues } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { Rating } from '@/components';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface ReviewFormDialogProps {
  open: boolean;
  productName: string;
  /** Present when editing. */
  initial?: ReviewFormValues;
  pending: boolean;
  /** i18n key of the last failure. */
  errorKey: string | null;
  onSubmit: (values: ReviewFormValues) => void;
  onClose: () => void;
}

/** Star picker + optional text. Mounted per open, so the fields start fresh. */
export function ReviewFormDialog({
  open,
  productName,
  initial,
  pending,
  errorKey,
  onSubmit,
  onClose,
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
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? t('reviews.edit') : t('reviews.write')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {productName}
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" component="label" id="review-rating">
              {t('reviews.yourRating')}
            </Typography>
            <Rating
              readOnly={false}
              precision={1}
              size="large"
              value={rating}
              onChange={(_, value) => setRating(value)}
              getLabelText={(value: number) => t('reviews.ratingAria', { value })}
              aria-labelledby="review-rating"
            />
            {touched && rating === null && (
              <Typography variant="caption" color="error">
                {t('reviews.pickRating')}
              </Typography>
            )}
          </Stack>
          <TextField
            label={t('reviews.text')}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
            multiline
            minRows={3}
            fullWidth
            helperText={t('reviews.textHelper', { count: text.length, max: REVIEW_TEXT_MAX })}
          />
          {errorKey && <Alert severity="error">{tk(errorKey)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          {t('reviews.cancel')}
        </Button>
        <Button variant="contained" onClick={submit} disabled={pending}>
          {initial ? t('reviews.save') : t('reviews.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
