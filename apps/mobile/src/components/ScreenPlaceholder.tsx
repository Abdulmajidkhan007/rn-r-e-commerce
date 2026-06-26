import { View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenPlaceholderProps {
  title: string;
  subtitle?: string;
}

/** Phase 0 placeholder rendering a screen's name via Paper components. */
export function ScreenPlaceholder({ title, subtitle }: ScreenPlaceholderProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-center gap-3 px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Chip icon="flask-outline" compact>
        Phase 0 · placeholder
      </Chip>
      <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" className="text-center opacity-70">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
