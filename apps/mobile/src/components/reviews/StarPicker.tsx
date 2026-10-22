import { View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

export interface StarPickerProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** Tappable 1–5 stars for the review form. */
export function StarPicker({ value, onChange }: StarPickerProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row' }} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((star) => (
        <IconButton
          key={star}
          icon={value !== null && star <= value ? 'star' : 'star-outline'}
          iconColor={theme.colors.primary}
          size={32}
          onPress={() => onChange(star)}
          accessibilityLabel={t('reviews.ratingAria', { value: star })}
          accessibilityState={{ selected: value === star }}
          style={{ margin: 0 }}
        />
      ))}
    </View>
  );
}
