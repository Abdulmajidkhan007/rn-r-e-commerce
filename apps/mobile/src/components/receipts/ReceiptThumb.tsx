import { Image, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

/** A tappable receipt preview; opens the full-size modal. */
export function ReceiptThumb({
  src,
  onOpen,
  size = 72,
}: {
  src: string;
  onOpen: () => void;
  size?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t('receipts.view')}>
      <Image
        source={{ uri: src }}
        style={{
          width: size,
          height: size,
          borderRadius: theme.roundness * 2,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      />
    </Pressable>
  );
}
