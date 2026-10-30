import { View } from 'react-native';
import { HelperText, ProgressBar, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { deliveryText, freeDeliveryRemaining, type DeliverySettings } from '@kidswear/core';
import { formatPrice } from '@kidswear/utils';
import type { SupportedLanguage } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { Card } from '@/components/Card';

export interface CartThresholdsProps {
  settings: DeliverySettings | null | undefined;
  /** Goods amount after any discount — what both thresholds are measured on. */
  amount: number;
  language: SupportedLanguage;
}

/**
 * "X so'm more for free delivery" progress and the minimum-order notice.
 * Renders nothing when the shop has set neither threshold.
 */
export function CartThresholds({
  settings,
  amount,
  language,
}: CartThresholdsProps): React.ReactElement | null {
  const theme = useTheme();
  const text = deliveryText(settings, language, (som) => formatPrice(som, language), amount);
  const freeLeft = freeDeliveryRemaining(settings, amount);
  if (freeLeft === null && text.min === null) return null;

  const freeFrom = settings?.freeFrom ?? 0;
  const progress = freeFrom > 0 ? Math.min(1, amount / freeFrom) : 0;
  const reached = freeLeft === 0;

  return (
    <View style={{ gap: tokens.spacing.sm }}>
      {text.min !== null ? (
        <HelperText type="error" visible>
          {text.min}
        </HelperText>
      ) : null}
      {freeLeft !== null ? (
        <Card>
          <View style={{ gap: tokens.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={20}
                color={reached ? theme.colors.tertiary : theme.colors.primary}
              />
              <Text variant="bodyMedium" style={{ fontWeight: '700', flex: 1 }}>
                {text.free}
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={reached ? theme.colors.tertiary : theme.colors.primary}
              style={{ height: 6, borderRadius: tokens.radii.sm }}
            />
          </View>
        </Card>
      ) : null}
    </View>
  );
}
