import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { nextSlideIndex, type TvSlide } from '@kidswear/core';
import { useTvSettings, useTvSlides } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { ProductImage } from '@/components/ProductImage';
import { useLocalized } from '@/lib/useLocalized';
import { useNoIndex } from '@/lib/useSeo';

/** Keeps the screen awake where the browser allows it; silently skipped elsewhere. */
function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = (): void => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, []);
}

/**
 * Store TV screen: full-screen product slideshow, no mouse needed. Public data
 * only (name, photo, price) — it is built from `TvSlide`, never a raw Product.
 */
export default function TvPage(): React.ReactElement {
  const { t } = useTranslation();
  useNoIndex();
  useWakeLock();
  const settings = useTvSettings();
  const slides = useTvSlides(settings);
  const [index, setIndex] = useState(0);
  const count = slides?.length ?? 0;
  const seconds = settings?.slideSeconds ?? 8;

  useEffect(() => {
    if (count < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((i) => nextSlideIndex(i, count));
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [count, seconds]);

  const slide = slides?.[index % Math.max(count, 1)];

  return (
    <Box
      component="main"
      aria-label={t('tv.title')}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'background.default',
        color: 'text.primary',
        cursor: 'none',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {slides === undefined ? (
        <CircularProgress aria-label={t('tv.loading')} size={96} />
      ) : slide === undefined ? (
        <Typography sx={{ fontSize: 'clamp(2rem, 4vw, 4rem)', textAlign: 'center', px: 4 }}>
          {t('tv.noSlides')}
        </Typography>
      ) : (
        <Slide key={slide.id} slide={slide} />
      )}
    </Box>
  );
}

function Slide({ slide }: { slide: TvSlide }): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const name = localized(slide.name);
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        gap: { xs: 3, md: 8 },
        p: { xs: 3, md: 8 },
        '@keyframes tvIn': { from: { opacity: 0 }, to: { opacity: 1 } },
        animation: 'tvIn 600ms ease-out',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <ProductImage
        src={slide.image}
        alt={name}
        sx={{
          flex: { md: '1 1 55%' },
          width: '100%',
          height: { xs: '55%', md: '100%' },
          borderRadius: 4,
        }}
      />
      <Box sx={{ flex: { md: '1 1 45%' }, textAlign: { xs: 'center', md: 'left' } }}>
        {slide.compareAtPrice !== undefined && (
          <Chip
            color="error"
            label={t('tv.sale')}
            sx={{ fontSize: 'clamp(1.25rem, 2.2vw, 2.5rem)', height: 'auto', py: 1, mb: 3 }}
          />
        )}
        <Typography
          component="h1"
          sx={{ fontSize: 'clamp(2.5rem, 5.5vw, 7rem)', fontWeight: 800, lineHeight: 1.1 }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontSize: 'clamp(2.5rem, 6vw, 8rem)',
            fontWeight: 700,
            color: 'primary.main',
            mt: 3,
          }}
        >
          {formatPrice(slide.price, language)}
        </Typography>
        {slide.compareAtPrice !== undefined && (
          <Typography
            sx={{
              fontSize: 'clamp(1.5rem, 3vw, 4rem)',
              color: 'text.secondary',
              textDecoration: 'line-through',
            }}
          >
            {formatPrice(slide.compareAtPrice, language)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
