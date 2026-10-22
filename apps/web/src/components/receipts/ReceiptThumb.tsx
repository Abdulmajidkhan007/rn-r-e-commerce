import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useTranslation } from '@kidswear/i18n';

/** A clickable receipt preview; opens the full-size dialog. */
export function ReceiptThumb({
  src,
  onOpen,
  size = 72,
}: {
  src: string;
  onOpen: () => void;
  size?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={t('receipts.view')}
      sx={{ borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}
    >
      <Box
        component="img"
        src={src}
        alt={t('receipts.image')}
        sx={{
          width: size,
          height: size,
          objectFit: 'cover',
          display: 'block',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
        }}
      />
    </ButtonBase>
  );
}
