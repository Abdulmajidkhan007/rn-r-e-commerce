import { useNavigation } from '@react-navigation/native';
import { IconButton, useTheme } from 'react-native-paper';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useFavoritesContext } from '@/providers/FavoritesProvider';

/** Heart toggle. Signed-out users are sent to log in first. */
export function FavoriteButton({
  productId,
  size = 20,
}: {
  productId: string;
  size?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { ids, toggle } = useFavoritesContext();
  const active = ids.has(productId);

  return (
    <IconButton
      icon={active ? 'heart' : 'heart-outline'}
      size={size}
      mode="contained-tonal"
      iconColor={active ? theme.colors.error : theme.colors.onSurfaceVariant}
      accessibilityLabel={active ? t('favorites.remove') : t('favorites.add')}
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!user) {
          navigation.navigate('Login');
          return;
        }
        void toggle(productId);
      }}
    />
  );
}
