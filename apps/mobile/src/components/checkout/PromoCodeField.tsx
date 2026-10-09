import { useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { evaluatePromo, normalizePromoCode, type PromoCode } from '@kidswear/core';
import { useLookupPromo } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatPrice } from '@kidswear/utils';
import { useNow } from '@/lib/useNow';

export interface AppliedPromo {
  code: string;
  promo: PromoCode;
}

/**
 * Promo code input — early feedback only. useCheckout re-reads the code at
 * order time and the Firestore rules check the discount a third time.
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
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          mode="outlined"
          dense
          style={{ flex: 1 }}
          label={t('promo.label')}
          value={input}
          onChangeText={(v) => setInput(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={20}
          disabled={!!applied}
          onSubmitEditing={() => void apply()}
        />
        {applied ? (
          <Button
            mode="outlined"
            onPress={() => {
              onChange(null);
              setInput('');
              setMessage(null);
            }}
          >
            {t('promo.remove')}
          </Button>
        ) : (
          <Button
            mode="outlined"
            loading={lookup.isPending}
            disabled={lookup.isPending || !input}
            onPress={() => void apply()}
          >
            {t('promo.apply')}
          </Button>
        )}
      </View>
      {current?.ok ? (
        <HelperText type="info" visible>
          {t('promo.applied', { amount: formatPrice(current.discount, language) })}
        </HelperText>
      ) : null}
      {current && !current.ok ? (
        <HelperText type="error" visible>
          {t(`promo.errors.${current.reason}`)}
        </HelperText>
      ) : null}
      {message ? (
        <HelperText type="error" visible>
          {message}
        </HelperText>
      ) : null}
    </View>
  );
}
