import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { alpha } from '@mui/material/styles';
import { useAuth } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { useFavoritesContext } from '@/app/FavoritesProvider';

/** Heart toggle. Signed-out users are sent to log in first. */
export function FavoriteButton({
  productId,
  size = 'small',
}: {
  productId: string;
  size?: 'small' | 'medium';
}): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ids, toggle } = useFavoritesContext();
  const active = ids.has(productId);

  return (
    <IconButton
      size={size}
      aria-pressed={active}
      aria-label={active ? t('favorites.remove') : t('favorites.add')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          navigate('/login');
          return;
        }
        void toggle(productId);
      }}
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.background.paper, 0.85),
        '&:hover': { bgcolor: theme.palette.background.paper },
        color: active ? 'error.main' : 'text.secondary',
      })}
    >
      {active ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
    </IconButton>
  );
}
