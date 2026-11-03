import { View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/** Increment/decrement control for cart quantities. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantityStepperProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center">
      <IconButton
        icon="minus"
        accessibilityLabel={t('a11y.decrease')}
        mode="outlined"
        size={16}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <Text variant="titleMedium" className="w-8 text-center">
        {value}
      </Text>
      <IconButton
        icon="plus"
        accessibilityLabel={t('a11y.increase')}
        mode="outlined"
        size={16}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}
