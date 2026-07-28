import Card from '@mui/material/Card';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import type { PaymentProvider } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';

export interface PaymentMethodPickerProps {
  providers: readonly PaymentProvider[];
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
}

/**
 * Choice of deposit gateway. Only configured providers are listed — an
 * unconfigured one would send the customer to a blank gateway page.
 */
export function PaymentMethodPicker({
  providers,
  value,
  onChange,
}: PaymentMethodPickerProps): React.ReactElement | null {
  const { t } = useTranslation();

  // With a single option there is nothing to choose; the caller already
  // defaults to it.
  if (providers.length < 2) return null;

  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {t('payment.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('payment.depositNote')}
      </Typography>

      <FormControl>
        <RadioGroup
          value={value}
          onChange={(e) => onChange(e.target.value as PaymentProvider)}
        >
          {providers.map((provider) => (
            <FormControlLabel
              key={provider}
              value={provider}
              control={<Radio />}
              label={t(`payment.${provider}`)}
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Card>
  );
}
