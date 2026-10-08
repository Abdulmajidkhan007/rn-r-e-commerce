import { View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';

export interface RatingProps {
  value: number;
  max?: number;
  size?: number;
}

type StarName = 'star' | 'star-half-full' | 'star-outline';

/** Read-only star rating using Material Community Icons. */
export function Rating({ value, max = 5, size = 18 }: RatingProps): React.ReactElement {
  const theme = useTheme();
  const stars: StarName[] = Array.from({ length: max }, (_, i) => {
    const position = i + 1;
    if (value >= position) return 'star';
    if (value >= position - 0.5) return 'star-half-full';
    return 'star-outline';
  });

  return (
    <View className="flex-row" accessibilityLabel={`Rating ${value} of ${max}`}>
      {stars.map((name, i) => (
        <MaterialCommunityIcons key={i} name={name} size={size} color={theme.colors.primary} />
      ))}
    </View>
  );
}
