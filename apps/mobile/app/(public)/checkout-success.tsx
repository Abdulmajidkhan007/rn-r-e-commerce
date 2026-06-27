import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';

export default function CheckoutSuccessScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { orderId = '' } = useLocalSearchParams<{ orderId: string }>();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <MaterialCommunityIcons name="check-circle" size={72} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={{ fontWeight: '800', textAlign: 'center' }}>
        {t('checkout.orderPlaced')}
      </Text>
      <Text style={{ opacity: 0.7, textAlign: 'center' }}>{t('checkout.orderConfirmation')}</Text>

      {orderId ? (
        <Card mode="outlined">
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {t('checkout.orderId')}
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {orderId}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {orderId ? (
          <Button mode="contained" onPress={() => router.replace(`/order/${orderId}`)}>
            {t('orders.viewOrder')}
          </Button>
        ) : null}
        <Button mode="outlined" onPress={() => router.replace('/')}>
          {t('checkout.backToHome')}
        </Button>
      </View>
    </View>
  );
}
