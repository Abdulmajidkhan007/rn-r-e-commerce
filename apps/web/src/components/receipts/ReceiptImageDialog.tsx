import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@kidswear/i18n';

export interface ReceiptImageDialogProps {
  /** Data URL of the receipt, or null when closed. */
  src: string | null;
  onClose: () => void;
}

/** A receipt at full size — full screen on phones, scrollable when taller than the view. */
export function ReceiptImageDialog({ src, onClose }: ReceiptImageDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={src !== null} onClose={onClose} fullScreen={fullScreen} maxWidth="md">
      <DialogContent sx={{ p: 1, bgcolor: 'background.default' }}>
        {src && (
          <Box
            component="img"
            src={src}
            alt={t('receipts.image')}
            sx={{ display: 'block', maxWidth: '100%', height: 'auto', mx: 'auto' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('receipts.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
