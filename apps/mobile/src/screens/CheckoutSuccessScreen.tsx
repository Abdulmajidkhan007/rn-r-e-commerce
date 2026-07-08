import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from '@kidswear/i18n';
import type { RootStackParamList } from '@/navigation/types';

export function CheckoutSuccessScreen(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CheckoutSuccess'>>();
  const orderId = params?.orderId ?? '';

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
          <Button mode="contained" onPress={() => navigation.replace('OrderDetail', { id: orderId })}>
            {t('orders.viewOrder')}
          </Button>
        ) : null}
        <Button mode="outlined" onPress={() => navigation.replace('Tabs')}>
          {t('checkout.backToHome')}
        </Button>
      </View>
    </View>
  );
}
