import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, List, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blogParagraphs } from '@kidswear/core';
import { useFaqs } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useLocalized } from '@/lib/useLocalized';
import type { RootStackParamList } from '@/navigation/types';

export function FaqScreen(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const localized = useLocalized();
  const { data: faqs = [], isLoading, refetch, isRefetching } = useFaqs();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={faqs}
      keyExtractor={(f) => f.id}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={
        <Text variant="bodyMedium" style={{ opacity: 0.7, marginBottom: 8 }}>
          {t('faq.subtitle')}
        </Text>
      }
      ListEmptyComponent={
        <Text variant="bodyMedium" style={{ opacity: 0.7, textAlign: 'center', marginTop: 32 }}>
          {t('faq.empty')}
        </Text>
      }
      ListFooterComponent={
        <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
          <Text variant="bodyMedium">{t('faq.contactCta')}</Text>
          <Button compact onPress={() => navigation.navigate('Contact')}>
            {t('faq.contactLink')}
          </Button>
        </View>
      }
      renderItem={({ item }) => (
        <List.Accordion title={localized(item.question)} titleNumberOfLines={4}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
            {blogParagraphs(localized(item.answer)).map((p, i) => (
              <Text key={i} variant="bodyMedium">
                {p}
              </Text>
            ))}
          </View>
        </List.Accordion>
      )}
    />
  );
}
