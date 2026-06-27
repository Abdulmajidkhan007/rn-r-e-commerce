import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useTranslation } from '@kidswear/i18n';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Confirm button label; defaults to the title. */
  confirmLabel?: string;
  /** Disables the confirm action (e.g. category in use). */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmDisabled = false,
}: ConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('admin.cancel')}</Button>
        <Button color="error" variant="contained" disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel ?? title}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
