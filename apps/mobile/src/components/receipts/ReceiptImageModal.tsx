import { Image, ScrollView, useWindowDimensions } from 'react-native';
import { Button, Modal, Portal, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@kidswear/i18n';

/** A receipt at full width; scrolls when the photo is taller than the screen. */
export function ReceiptImageModal({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <Portal>
      <Modal
        visible={src !== null}
        onDismiss={onClose}
        contentContainerStyle={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <ScrollView maximumZoomScale={3} contentContainerStyle={{ alignItems: 'center' }}>
          {src ? (
            <Image
              source={{ uri: src }}
              accessibilityLabel={t('receipts.image')}
              resizeMode="contain"
              style={{ width, height: height * 0.85 }}
            />
          ) : null}
        </ScrollView>
        <Button mode="contained-tonal" onPress={onClose} style={{ marginHorizontal: 16 }}>
          {t('receipts.close')}
        </Button>
      </Modal>
    </Portal>
  );
}
