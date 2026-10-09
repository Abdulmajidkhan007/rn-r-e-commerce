import { useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { evaluatePromo, normalizePromoCode, type PromoCode } from '@kidswear/core';
import { useLookupPromo } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { formatPrice } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';
import { useNow } from '@/lib/useNow';

export interface AppliedPromo {
  code: string;
  promo: PromoCode;
}

/**
 * Promo code input. Looks the code up and shows the result immediately; the
 * checkout re-reads and re-evaluates it at order time, and the rules check it
 * a third time — this component only gives early feedback.
 */
export function PromoCodeField({
  subtotal,
  applied,
  onChange,
}: {
  subtotal: number;
  applied: AppliedPromo | null;
  onChange: (next: AppliedPromo | null) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const lookup = useLookupPromo();
  const now = useNow();
  const [input, setInput] = useState(applied?.code ?? '');
  const [message, setMessage] = useState<string | null>(null);

  const apply = async (): Promise<void> => {
    const code = normalizePromoCode(input);
    if (!code) return;
    setMessage(null);
    try {
      const promo = await lookup.mutateAsync(code);
      const result = evaluatePromo(promo, subtotal, now);
      if (!result.ok || !promo) {
        onChange(null);
        setMessage(
          result.ok
            ? t('promo.errors.notFound')
            : t(`promo.errors.${result.reason}`, {
                amount: formatPrice(promo?.minSubtotal ?? 0, language),
              }),
        );
        return;
      }
      onChange({ code, promo });
    } catch {
      setMessage(t('promo.errors.generic'));
    }
  };

  const current = applied ? evaluatePromo(applied.promo, subtotal, now) : null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          label={t('promo.label')}
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void apply();
          }}
          disabled={!!applied}
          slotProps={{ htmlInput: { maxLength: 20, autoCapitalize: 'characters' } }}
        />
        {applied ? (
          <Button
            variant="outlined"
            onClick={() => {
              onChange(null);
              setInput('');
              setMessage(null);
            }}
          >
            {t('promo.remove')}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => void apply()}
            disabled={lookup.isPending || !input}
          >
            {t('promo.apply')}
          </Button>
        )}
      </Stack>
      {current?.ok && (
        <Alert severity="success">
          {t('promo.applied', { amount: formatPrice(current.discount, language) })}
        </Alert>
      )}
      {current && !current.ok && (
        <Alert severity="warning">{t(`promo.errors.${current.reason}`)}</Alert>
      )}
      {message && <Alert severity="error">{message}</Alert>}
    </Stack>
  );
}
