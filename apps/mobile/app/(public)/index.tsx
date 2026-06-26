import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@kidswear/i18n';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  LanguageSwitcher,
  PriceTag,
  QuantityStepper,
  Rating,
  Skeleton,
  ThemeToggle,
} from '@/components';

/** Home screen — also showcases the themed UI primitives. */
export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState(1);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
      <View className="gap-1">
        <Text variant="headlineMedium" style={{ fontWeight: '800' }}>
          {t('appName')}
        </Text>
        <Text variant="titleMedium" className="opacity-70">
          {t('nav.home')} · Phase 0 skeleton
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <LanguageSwitcher />
        <ThemeToggle />
      </View>

      <Card>
        <View className="gap-3">
          <Text variant="titleMedium">UI primitives</Text>
          <PriceTag price={189000} compareAtPrice={249000} size="lg" />
          <Rating value={4.5} />
          <QuantityStepper value={qty} onChange={setQty} />
          <Input label={t('actions.search')} />
          <View className="flex-row items-center gap-4">
            <Button>{t('actions.addToCart')}</Button>
            <View>
              <Badge>{qty}</Badge>
              <Avatar label="K" />
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View className="gap-2">
          <Text variant="titleMedium">Loading state</Text>
          <Skeleton height={96} />
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </View>
      </Card>
    </ScrollView>
  );
}
