import { useEffect } from 'react';
import { Animated, useAnimatedValue, type DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}

/** App skeleton loader — a pulsing placeholder block. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: SkeletonProps): React.ReactElement {
  const theme = useTheme();
  const opacity = useAnimatedValue(0.4);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        opacity,
        backgroundColor: theme.colors.surfaceVariant,
      }}
    />
  );
}
