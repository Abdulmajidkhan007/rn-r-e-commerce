import { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useImageSrc } from '@kidswear/data';

export interface ProductImageProps {
  /** A stored product image: https URL or `kwimg:<id>`. Missing → placeholder. */
  src: string | undefined;
  accessibilityLabel?: string;
  /** Sizing/shape of the frame (aspectRatio or width/height, borderRadius…). */
  style?: StyleProp<ViewStyle>;
  /** Visual tweaks for the photo itself, e.g. opacity for out-of-stock. */
  imageStyle?: StyleProp<ImageStyle>;
}

const ICON_RATIO = 0.36;
const ICON_MIN = 20;
const ICON_MAX = 96;

/**
 * Product photo in a fixed frame — same contract as the web `ProductImage`:
 * the frame keeps its size whether the photo is loading, missing or broken,
 * and without a photo shows a hanger icon on the theme's neutral surface.
 */
export function ProductImage({
  src,
  accessibilityLabel,
  style,
  imageStyle,
}: ProductImageProps): React.ReactElement {
  const theme = useTheme();
  const { uri, isLoading } = useImageSrc(src);
  const [failedUri, setFailedUri] = useState<string | undefined>(undefined);
  const [iconSize, setIconSize] = useState(ICON_MIN);
  const showImage = uri !== undefined && uri !== failedUri;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        const size = Math.min(width, height) * ICON_RATIO;
        setIconSize(Math.round(Math.min(ICON_MAX, Math.max(ICON_MIN, size))));
      }}
      style={[
        {
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceVariant,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailedUri(uri)}
          style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, imageStyle]}
        />
      ) : isLoading ? null : (
        <MaterialCommunityIcons
          name="hanger"
          size={iconSize}
          color={theme.colors.onSurfaceVariant}
          style={{ opacity: 0.6 }}
        />
      )}
    </View>
  );
}
