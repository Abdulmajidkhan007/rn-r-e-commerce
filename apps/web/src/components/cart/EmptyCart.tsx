import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';

/** Minimal shopping-bag illustration — inline SVG, no image asset / new dep. */
function BagIllustration({ color }: { color: string }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path
        d="M30 34V26a18 18 0 0 1 36 0v8"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M22 34h52l-3.6 44.5A6 6 0 0 1 64.4 84H31.6a6 6 0 0 1-6-5.5L22 34Z"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M35 46v6M61 46v6" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** Empty-cart state: illustration, message, and a CTA back into the catalog. */
export function EmptyCart(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: 'center',
        textAlign: 'center',
        py: `${tokens.spacing['4xl']}px`,
      }}
    >
      <BagIllustration color={theme.palette.primary.main} />
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('cart.emptyCart', { defaultValue: "Savatchangiz bo'sh" })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        {t('cart.emptyHint', {
          defaultValue: "Sevimli mahsulotlaringizni tanlab, savatchaga qo'shing.",
        })}
      </Typography>
      <Button component={RouterLink} to="/catalog" variant="contained" size="large">
        {t('cart.continueShopping', { defaultValue: 'Xarid qilishni davom ettirish' })}
      </Button>
    </Stack>
  );
}
