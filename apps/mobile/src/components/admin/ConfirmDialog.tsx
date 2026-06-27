import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Disables the confirm action (e.g. category in use). */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onDismiss,
  confirmDisabled = false,
}: ConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('admin.cancel')}</Button>
          <Button mode="contained" disabled={confirmDisabled} onPress={onConfirm}>
            {title}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
